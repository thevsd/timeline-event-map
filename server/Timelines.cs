using System.Security.Claims;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public record TimelineInfo(Guid Id, string Title, bool Pinned, int Size, DateTimeOffset UpdatedAt);
// Either or both: a new title, pinned or not.
public record TimelinePatch(string? Title, bool? Pinned);

// The signed-in user's timelines. Every query is filtered by owner, so another user's id answers 404.
public static class Timelines
{
    // Largest timeline accepted, in bytes. Postgres would hold far more; this keeps one save to one request.
    public const int MaxBytes = 10_000_000;

    public static void MapTimelines(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/timelines").RequireAuthorization();

        g.MapGet("/", async (ClaimsPrincipal me, AppDb db) =>
            await db.Timelines.Where(t => t.OwnerId == Owner(me)).OrderByDescending(t => t.CreatedAt)
                .Select(t => new TimelineInfo(t.Id, t.Title, t.Pinned, t.Size, t.UpdatedAt)).ToListAsync());

        g.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal me, AppDb db) =>
            await db.Timelines.Where(t => t.Id == id && t.OwnerId == Owner(me)).Select(t => t.Data).FirstOrDefaultAsync()
                is { } data ? Results.Text(data, "application/json") : Results.NotFound());

        // The list is newest first.
        g.MapPost("/", async (HttpRequest req, ClaimsPrincipal me, AppDb db) =>
        {
            var (json, title, problem) = await Read(req);
            if (problem is not null) return problem;
            var now = DateTimeOffset.UtcNow;
            var t = new Timeline { Id = Guid.NewGuid(), OwnerId = Owner(me), CreatedAt = now };
            Store(t, json, title, now);
            db.Timelines.Add(t);
            await db.SaveChangesAsync();
            return Results.Ok(Info(t));
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
            return Results.Ok(Info(t));
        }).WithMetadata(new RequestSizeLimitAttribute(MaxBytes));

        // From the list. A rename changes the title inside the JSON too, so the list, the app and exports agree.
        // Pinning is not an edit: the saved time stays.
        g.MapPatch("/{id:guid}", async (Guid id, TimelinePatch req, ClaimsPrincipal me, AppDb db) =>
        {
            var t = await db.Timelines.FirstOrDefaultAsync(t => t.Id == id && t.OwnerId == Owner(me));
            if (t is null) return Results.NotFound();
            if (req.Title is not null)
            {
                var title = TitleOf(req.Title);
                var doc = JsonNode.Parse(t.Data)!.AsObject();
                doc["title"] = title;
                Store(t, doc.ToJsonString(), title, DateTimeOffset.UtcNow);
            }
            if (req.Pinned is { } pinned) t.Pinned = pinned;
            await db.SaveChangesAsync();
            return Results.Ok(Info(t));
        });

        g.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal me, AppDb db) =>
            await db.Timelines.Where(t => t.Id == id && t.OwnerId == Owner(me)).ExecuteDeleteAsync() > 0
                ? Results.NoContent() : Results.NotFound());
    }

    static TimelineInfo Info(Timeline t) => new(t.Id, t.Title, t.Pinned, t.Size, t.UpdatedAt);

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
