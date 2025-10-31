using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MiniProjectManager.Models;

namespace MiniProjectManager.Data
{
    // Use IdentityDbContext to include tables for Users, Roles, etc.
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // DbSets for your custom models
        public DbSet<Project> Projects { get; set; }
        public DbSet<TaskItem> TaskItems { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure relationships

            // A User can have many Projects
            builder.Entity<ApplicationUser>()
                .HasMany(u => u.Projects)
                .WithOne(p => p.ApplicationUser)
                .HasForeignKey(p => p.ApplicationUserId)
                .OnDelete(DeleteBehavior.Cascade); // If user is deleted, delete their projects

            // A Project can have many Tasks
            builder.Entity<Project>()
                .HasMany(p => p.Tasks)
                .WithOne(t => t.Project)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade); // If project is deleted, delete its tasks
        }
    }
}

