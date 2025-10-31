using Microsoft.AspNetCore.Identity;
using System.Collections.Generic;

namespace MiniProjectManager.Models
{
    // Extends the built-in IdentityUser
    public class ApplicationUser : IdentityUser
    {
        // Navigation property for projects
        public ICollection<Project> Projects { get; set; } = new List<Project>();
    }
}

