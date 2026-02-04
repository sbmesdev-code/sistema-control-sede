import type { CollectionType, Gender } from "../types/inventory";

export function generateBaseSKU(
    collection: CollectionType,
    type: string,
    gender: Gender,
    name: string
): string {
    // 1. Validations
    if (!type || !name) return 'INVALID-SKU';

    // 2. Collection Code (3 letters usually)
    // If standard, use map, otherwise take first 3 chars
    const colCodeMap: Record<string, string> = {
        'VERANO': 'VER',
        'INVIERNO': 'INV',
        'ANADIBLES': 'ADD'
    };

    const cleanCollection = collection.trim().toUpperCase();
    const colCode = colCodeMap[cleanCollection] || cleanCollection.slice(0, 3).replace(/[^A-Z]/g, 'X');

    // 3. Gender Code
    const genCode = {
        'HOMBRE': 'H',
        'MUJER': 'M',
        'UNISEX': 'U'
    }[gender] || 'U';

    // 4. Type Code (First 3 chars of type, uppercase)
    // Remove vowels to make it more cryptic/short? or just first 3?
    // Let's use first 3 letters for readability
    const typeCode = type.slice(0, 3).toUpperCase();

    // 5. Name Code (Acronym from name or first 3 letters)
    // e.g. "Polo Basico" -> "PB"
    const nameCode = name
        .split(' ')
        .map(word => word[0])
        .join('')
        .slice(0, 3)
        .toUpperCase();

    // Format: COL-TYPE-GEN-NAME
    // Example: VER-POL-H-PB
    return `${colCode}-${typeCode}-${genCode}-${nameCode}`;
}


export function generateVariantSKU(
    baseSku: string,
    color: string,
    size: string
): string {
    // Helper to shorten colors (can be expanded)
    const colorMap: Record<string, string> = {
        'negro': 'BLK', 'black': 'BLK',
        'blanco': 'WHT', 'white': 'WHT',
        'rojo': 'RED',
        'azul': 'BLU', 'blue': 'BLU',
        'verde': 'GRN', 'green': 'GRN',
        'amarillo': 'YEL',
    };

    const colorCode = colorMap[color.toLowerCase()] || color.slice(0, 3).toUpperCase();
    const sizeCode = size.toUpperCase();

    // Format: BASE-COLOR-SIZE
    // Example: VER-POL-H-PB-BLK-M
    return `${baseSku}-${colorCode}-${sizeCode}`;
}
