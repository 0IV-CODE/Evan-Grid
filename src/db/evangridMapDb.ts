import Dexie, { type Table } from 'dexie'

export type MapHouseRecord = {
  id: string
  name: string
  address: string
  lng: number
  lat: number
  status: string
  language: string
  notes: string
  icon: string
  locked: boolean
}

export type MapZoneRecord = {
  id: string
  name: string
  color: string
  notes: string
  shape: string
  centerLng: number
  centerLat: number
  width: number
  height: number
  locked: boolean
  coordinates: number[][][]
}

export type MapArrowRecord = {
  id: string
  name: string
  lng: number
  lat: number
  color: string
  length: number
  rotation: number
  notes: string
  locked: boolean
}

export type MapTextRecord = {
  id: string
  name: string
  text: string
  lng: number
  lat: number
  color: string
  fontSize: number
  rotation: number
  notes: string
  locked: boolean
}

export type MapLinePointRecord = {
  id: string
  name: string
  lng: number
  lat: number
}

export type MapLineRecord = {
  id: string
  name: string
  color: string
  notes: string
  locked: boolean
  points: MapLinePointRecord[]
}

class EvangridMapDb extends Dexie {
  houses!: Table<MapHouseRecord, string>
  zones!: Table<MapZoneRecord, string>
  arrows!: Table<MapArrowRecord, string>
  texts!: Table<MapTextRecord, string>
  lines!: Table<MapLineRecord, string>

  constructor() {
    super('evangrid_map_db')

    this.version(1).stores({
      houses: 'id, name, status, locked',
      zones: 'id, name, shape, locked',
      arrows: 'id, name, locked',
      texts: 'id, name, locked',
      lines: 'id, name, locked',
    })
  }
}

export const evangridMapDb = new EvangridMapDb()
