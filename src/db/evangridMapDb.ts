// Import Dexie itself and the Table type.
// Dexie is the wrapper around IndexedDB.
// IndexedDB is the browser/mobile local database.
import Dexie, { type Table } from 'dexie'

// -----------------------------------------------------------------------------
// HOUSE RECORD
// -----------------------------------------------------------------------------
// This is the exact shape saved into the "houses" table.
//
// Note:
// This is a TypeScript type only.
// It helps while coding, but it does not protect runtime data.
// Bad data can still exist in Dexie if old data, manual edits, imports,
// or bugs save the wrong values.
export type MapHouseRecord = {
  // Main primary key.
  // You are using string IDs, probably crypto.randomUUID().
  id: string

  // Display name shown on the marker.
  name: string

  // Optional address text.
  address: string

  // Longitude and latitude used by MapLibre.
  // Should be validated before saving:
  // lng: -180 to 180
  // lat: -90 to 90
  lng: number
  lat: number

  // Status controls marker meaning/color.
  // Better later: make this a union type instead of plain string.
  status: string

  // Language used at this house/contact.
  language: string

  // Freeform notes.
  notes: string

  // Icon name used by your marker renderer.
  // Better later: make this a union type instead of plain string.
  icon: string

  // When locked, the marker should not be draggable/editable.
  locked: boolean
}

// -----------------------------------------------------------------------------
// ZONE RECORD
// -----------------------------------------------------------------------------
// Saved zone/area object.
// This supports rectangles, squares, circles, and any future shape types.
export type MapZoneRecord = {
  id: string
  name: string
  color: string
  notes: string

  // Shape name.
  // Better later: use a union type:
  // 'square' | 'rectangle' | 'circle'
  shape: string

  // Center point for the zone.
  centerLng: number
  centerLat: number

  // Size of the zone in map coordinate degrees.
  // Should be protected from zero, negative, NaN, or huge values.
  width: number
  height: number

  // Rotation in degrees.
  // Good that you added this.
  // Your MapVisual code uses rotation, so it belongs in Dexie.
  rotation: number

  locked: boolean

  // GeoJSON polygon coordinates.
  // This is useful for drawing, but it is also duplicated data because
  // it can be recalculated from centerLng, centerLat, width, height,
  // shape, and rotation.
  coordinates: number[][][]
}

// -----------------------------------------------------------------------------
// STRAIGHT LINE / ARROW RECORD
// -----------------------------------------------------------------------------
// This is the simple straight line object.
// You currently call it arrow in the DB, but visually it is more like a line.
export type MapArrowRecord = {
  id: string
  name: string

  // Start point of the line.
  lng: number
  lat: number

  color: string

  // Pixel/map display length depending on how you calculate it.
  // Should be kept positive.
  length: number

  // Rotation in degrees.
  rotation: number

  notes: string
  locked: boolean
}

// -----------------------------------------------------------------------------
// TEXT RECORD
// -----------------------------------------------------------------------------
// Saved map label.
export type MapTextRecord = {
  id: string
  name: string

  // Actual text shown on the map.
  text: string

  // Text position.
  lng: number
  lat: number

  color: string

  // Text size.
  // Should be clamped to a safe range, for example 8 to 72.
  fontSize: number

  // Text rotation in degrees.
  rotation: number

  notes: string
  locked: boolean
}

// -----------------------------------------------------------------------------
// LINE POINT RECORD
// -----------------------------------------------------------------------------
// One point in a chained-dot line.
export type MapLinePointRecord = {
  id: string
  name: string
  lng: number
  lat: number
}

// -----------------------------------------------------------------------------
// CHAINED-DOT LINE RECORD
// -----------------------------------------------------------------------------
// A multi-point line made from connected draggable points.
export type MapLineRecord = {
  id: string
  name: string
  color: string
  notes: string
  locked: boolean

  // Ordered list of points.
  // The order matters because it controls the connected line shape.
  points: MapLinePointRecord[]
}

// -----------------------------------------------------------------------------
// DATABASE CLASS
// -----------------------------------------------------------------------------
// This creates a typed Dexie database.
// Each property becomes a table reference you can use elsewhere:
//
// evangridMapDb.houses.toArray()
// evangridMapDb.zones.put(zone)
// evangridMapDb.lines.delete(id)
class EvangridMapDb extends Dexie {
  // Table<RecordType, PrimaryKeyType>
  // Your primary keys are strings.
  houses!: Table<MapHouseRecord, string>
  zones!: Table<MapZoneRecord, string>
  arrows!: Table<MapArrowRecord, string>
  texts!: Table<MapTextRecord, string>
  lines!: Table<MapLineRecord, string>

  constructor() {
    // Actual IndexedDB database name.
    // Changing this name creates a separate local database.
    super('evangrid_map_db')

    // Database version.
    // If you change table structure later, create version(2), version(3), etc.
    this.version(1).stores({
      // Format:
      // tableName: 'primaryKey, indexedField1, indexedField2'
      //
      // Important:
      // These are indexes, not validation rules.
      // Dexie will not enforce that name is a string or lng is valid.

      // Houses can be quickly searched/sorted by:
      // id, name, status, locked
      houses: 'id, name, status, locked',

      // Zones can be queried by:
      // id, name, shape, locked
      zones: 'id, name, shape, locked',

      // Arrows/straight lines can be queried by:
      // id, name, locked
      arrows: 'id, name, locked',

      // Text labels can be queried by:
      // id, name, locked
      texts: 'id, name, locked',

      // Chained-dot lines can be queried by:
      // id, name, locked
      lines: 'id, name, locked',
    })
  }
}

// Single exported database instance.
// Import this anywhere you need local map storage.
export const evangridMapDb = new EvangridMapDb()
