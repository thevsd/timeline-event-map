using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimelineApi.Migrations
{
    /// <inheritdoc />
    public partial class PinTimelines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Position",
                table: "Timelines");

            migrationBuilder.AddColumn<bool>(
                name: "Pinned",
                table: "Timelines",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Pinned",
                table: "Timelines");

            migrationBuilder.AddColumn<int>(
                name: "Position",
                table: "Timelines",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
