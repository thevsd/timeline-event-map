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
}
