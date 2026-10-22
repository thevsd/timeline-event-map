using System.Security.Claims;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public record TimelineInfo(Guid Id, string Title, int Size, DateTimeOffset UpdatedAt);
public record RenameRequest(string Title);

// The signed-in user's timelines. Every query is filtered by owner, so another user's id answers 404.
public static class Timelines
{
    // Largest timeline accepted, in bytes. Postgres would hold far more; this keeps one save to one request.
    public const int MaxBytes = 10_000_000;

    public static void MapTimelines(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/timelines").RequireAuthorization();

        g.MapGet("/", async (ClaimsPrincipal me, AppDb db) =>
            await db.Timelines.Where(t => t.OwnerId == Owner(me)).OrderBy(t => t.Position)
                .Select(t => new TimelineInfo(t.Id, t.Title, t.Size, t.UpdatedAt)).ToListAsync());

        g.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal me, AppDb db) =>
            await db.Timelines.Where(t => t.Id == id && t.OwnerId == Owner(me)).Select(t => t.Data).FirstOrDefaultAsync()
                is { } data ? Results.Text(data, "application/json") : Results.NotFound());

        // A new timeline goes to the top of the list.
        g.MapPost("/", async (HttpRequest req, ClaimsPrincipal me, AppDb db) =>
        {
            var (json, title, problem) = await Read(req);
            if (problem is not null) return problem;
            var owner = Owner(me);
            var top = await db.Timelines.Where(t => t.OwnerId == owner).MinAsync(t => (int?)t.Position) ?? 0;
            var now = DateTimeOffset.UtcNow;
            var t = new Timeline { Id = Guid.NewGuid(), OwnerId = owner, Position = top - 1, CreatedAt = now };
            Store(t, json, title, now);
            db.Timelines.Add(t);
            await db.SaveChangesAsync();
            return Results.Ok(new TimelineInfo(t.Id, t.Title, t.Size, t.UpdatedAt));
        }).WithMetadata(new RequestSizeLimitAttribute(MaxBytes));

        // ponytail: last write wins; add a version check if two tabs overwriting each other becomes a problem.
        g.MapPut("/{id:guid}", async (Guid id, HttpRequest req, ClaimsPrincipal me, AppDb db) =>
        {
            var (json, title, problem) = await Read(req);
            if (problem is not null) return problem;
            var t = await db.Timelines.FirstOrDefaultAsync(t => t.Id == id && t.OwnerId == Owner(me));
            if (t is null) return Results.NotFound();
            Store(t, json, title, DateTimeOffset.UtcNow);
            await db.SaveChangesAsync();
            return Results.Ok(new TimelineInfo(t.Id, t.Title, t.Size, t.UpdatedAt));
        }).WithMetadata(new RequestSizeLimitAttribute(MaxBytes));

        // Rename from the list: the title inside the JSON changes too, so the list, the app and exports agree.
        g.MapPatch("/{id:guid}", async (Guid id, RenameRequest req, ClaimsPrincipal me, AppDb db) =>
        {
            var title = TitleOf(req.Title);
            var t = await db.Timelines.FirstOrDefaultAsync(t => t.Id == id && t.OwnerId == Owner(me));
            if (t is null) return Results.NotFound();
            var doc = JsonNode.Parse(t.Data)!.AsObject();
            doc["title"] = title;
            Store(t, doc.ToJsonString(), title, DateTimeOffset.UtcNow);
            await db.SaveChangesAsync();
            return Results.Ok(new TimelineInfo(t.Id, t.Title, t.Size, t.UpdatedAt));
        });

        g.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal me, AppDb db) =>
            await db.Timelines.Where(t => t.Id == id && t.OwnerId == Owner(me)).ExecuteDeleteAsync() > 0
                ? Results.NoContent() : Results.NotFound());

        // The whole list in its new order. Ids that are not the caller's are ignored.
        g.MapPut("/order", async (Guid[] ids, ClaimsPrincipal me, AppDb db) =>
        {
            var owner = Owner(me);
            var mine = await db.Timelines.Where(t => t.OwnerId == owner && ids.Contains(t.Id)).ToListAsync();
            foreach (var t in mine) t.Position = Array.IndexOf(ids, t.Id);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    static string Owner(ClaimsPrincipal me) => me.FindFirstValue(ClaimTypes.NameIdentifier)!;

    static string TitleOf(string? title) => string.IsNullOrWhiteSpace(title) ? "Untitled timeline" : title.Trim();

    static void Store(Timeline t, string json, string title, DateTimeOffset now)
    {
        t.Data = json;
        t.Title = title;
        t.Size = Encoding.UTF8.GetByteCount(json);
        t.UpdatedAt = now;
    }

    // The body is the timeline as the app exports it. Only its shape is checked here; the app's loader checks the rest.
    static async Task<(string Json, string Title, IResult? Problem)> Read(HttpRequest req)
    {
        string json;
        try { json = await new StreamReader(req.Body, Encoding.UTF8).ReadToEndAsync(); }
        catch (BadHttpRequestException e) when (e.StatusCode == StatusCodes.Status413PayloadTooLarge)
        {
            return ("", "", TooBig);
        }
        try
        {
            if (JsonNode.Parse(json) is JsonObject doc && doc["events"] is JsonArray)
            {
                var title = doc["title"] is JsonValue v && v.TryGetValue<string>(out var s) ? s : null;
                return (json, TitleOf(title), null);
            }
        }
        catch (System.Text.Json.JsonException) { }
        return ("", "", Results.Problem("This is not a timeline.", statusCode: StatusCodes.Status400BadRequest));
    }

    static readonly IResult TooBig = Results.Problem(
        $"This timeline is over {MaxBytes / 1_000_000} MB, too big to save. Remove some stored portraits, or export it as a file.",
        statusCode: StatusCodes.Status413PayloadTooLarge);
}
