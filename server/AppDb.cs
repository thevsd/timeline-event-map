using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

public class AppUser : IdentityUser
{
    // SHA-256 of the normalized recovery code; the code itself is only ever shown to the user.
    public string? RecoveryCodeHash { get; set; }
}

public class AppDb(DbContextOptions<AppDb> options) : IdentityDbContext<AppUser>(options), IDataProtectionKeyContext
{
    // Cookie encryption keys live here so sessions survive restarts and are shared across replicas.
    public DbSet<DataProtectionKey> DataProtectionKeys { get; set; } = null!;
    public DbSet<Timeline> Timelines { get; set; } = null!;
}

// One saved timeline: the app's export JSON plus what the list needs without reading it.
public class Timeline
{
    public Guid Id { get; set; }
    // Deleting the account deletes its timelines (required relationship, cascade).
    public string OwnerId { get; set; } = null!;
    public AppUser Owner { get; set; } = null!;
    // Copied from the JSON's own title on every save, so the list never has to parse Data.
    public string Title { get; set; } = "";
    // Pinned timelines always show on the home page; the rest fold away once there are more than three.
    public bool Pinned { get; set; }
    // jsonb: Postgres refuses anything that is not JSON.
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public string Data { get; set; } = "";
    // UTF-8 bytes of Data as sent.
    public int Size { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
