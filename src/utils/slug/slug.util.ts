/**
 * Slug Utility
 * Generates URL-friendly slugs from strings
 */
export class SlugUtil {
  /**
   * Generate a slug from a string
   * Converts to lowercase, replaces spaces with hyphens, removes special characters
   *
   * Examples:
   * - "Design" -> "design"
   * - "UI/UX Design" -> "ui-ux-design"
   * - "Web Development 101" -> "web-development-101"
   * - "Medical & Health" -> "medical-health"
   */
  static generate(text: string): string {
    return text
      .toLowerCase() // Convert to lowercase
      .trim() // Remove leading/trailing whitespace
      .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/[^\w\-]+/g, '-') // Replace non-word chars (except hyphens) with hyphens
      .replace(/\-\-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+/, '') // Remove leading hyphens
      .replace(/-+$/, ''); // Remove trailing hyphens
  }

  /**
   * Generate a unique slug by appending a number if needed
   *
   * Example:
   * - "design" -> "design-1" (if "design" exists)
   * - "design-1" -> "design-2" (if "design-1" exists)
   */
  static generateUnique(text: string, existingSlugs: string[]): string {
    const baseSlug = this.generate(text);
    let slug = baseSlug;
    let counter = 1;

    while (existingSlugs.includes(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}
