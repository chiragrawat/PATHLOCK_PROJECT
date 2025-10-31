# --- Stage 1: Build the app ---
# Use the official .NET 8 SDK image as a base
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Set the working directory inside the container
WORKDIR /src

# Copy the project file first and restore dependencies
# This caches the dependencies, speeding up future builds
COPY BasicTaskManager.csproj .
RUN dotnet restore "BasicTaskManager.csproj"

# Copy the rest of the source code and build
COPY . .
RUN dotnet publish "BasicTaskManager.csproj" -c Release -o /app/publish

# --- Stage 2: Create the final, smaller runtime image ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# The ASP.NET base image automatically listens on port 8080
# Render will detect this port and route traffic to it.
ENTRYPOINT ["dotnet", "BasicTaskManager.dll"]
