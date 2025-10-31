using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MiniProjectManager.Models
{
    public class Project
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 3)]
        public string Title { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        public DateTime CreationDate { get; set; } = DateTime.UtcNow;

        // Foreign key to the user
        [Required]
        public string ApplicationUserId { get; set; } = string.Empty;

        // Navigation property to the user
        public ApplicationUser? ApplicationUser { get; set; }

        // Navigation property to its tasks
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    }
}

