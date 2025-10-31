using BasicTaskManager.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Use an in-memory database
builder.Services.AddDbContext<TaskDbContext>(opt => opt.UseInMemoryDatabase("TaskList"));

// --- THIS IS THE FIX ---
// Add a new, permissive CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllOrigins",
        builder =>
        {
            builder.AllowAnyOrigin() // Allows requests from any URL
                   .AllowAnyHeader()
                   .AllowAnyMethod();
        });
});
// --- END OF FIX ---


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// --- THIS IS THE SECOND PART OF THE FIX ---
// Tell the app to USE the new policy
app.UseCors("AllowAllOrigins");
// --- END OF FIX ---

app.UseHttpsRedirection(); // This is often removed for Render deployment

// --- API Endpoints ---

// GET all tasks
app.MapGet("/api/tasks", async (TaskDbContext db) =>
    await db.Tasks.ToListAsync());

// GET a single task by ID
app.MapGet("/api/tasks/{id}", async (TaskDbContext db, Guid id) =>
    await db.Tasks.FindAsync(id)
        is TaskItem task
            ? Results.Ok(task)
            : Results.NotFound());

// POST (create) a new task
app.MapPost("/api/tasks", async (TaskDbContext db, TaskItem task) =>
{
    // Ensure ID is new and task is not completed by default
    task.Id = Guid.NewGuid();
    task.IsCompleted = false;
    
    db.Tasks.Add(task);
    await db.SaveChangesAsync();

    return Results.Created($"/api/tasks/{task.Id}", task);
});

// PUT (update) a task
app.MapPut("/api/tasks/{id}", async (TaskDbContext db, Guid id, TaskItem inputTask) =>
{
    var task = await db.Tasks.FindAsync(id);

    if (task is null) return Results.NotFound();

    // Update properties
    task.Description = inputTask.Description;
    task.IsCompleted = inputTask.IsCompleted;

    await db.SaveChangesAsync();

    return Results.NoContent();
});

// DELETE a task
app.MapDelete("/api/tasks/{id}", async (TaskDbContext db, Guid id) =>
{
    if (await db.Tasks.FindAsync(id) is TaskItem task)
    {
        db.Tasks.Remove(task);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    return Results.NotFound();
});

// Helper DbContext
public class TaskDbContext : DbContext
{
    public TaskDbContext(DbContextOptions<TaskDbContext> options) : base(options) { }
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
}

