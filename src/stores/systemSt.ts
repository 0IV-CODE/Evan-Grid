import { defineStore } from 'pinia'

type MenuOpenOpt = 'map' | 'books' | 'lyrics' | 'journal' | 'network' | 'settings'
type MapMode = 'online' | 'offline'

type MapTileStyle =
  | 'stadia_smooth'
  | 'stadia_dark'
  | 'carto_dark'
  | 'carto_light'
  | 'satellite'
  | 'osm_standard'
  | 'hot'
  | 'cyclosm'
  | 'topo'

type OfflineMapInfo = {
  id: string
  name: string
  folderPath: string
  downloadedAt: string
  tileCount: number
}

export const systemSt = defineStore('systemSt', {
  state: () => ({
    menuOpenOpt: 'map' as MenuOpenOpt,
    menuOpen: true,

    mapMode: 'online' as MapMode,
    mapTileStyle: 'stadia_dark' as MapTileStyle,

    // All downloaded maps found on phone
    offlineMaps: [] as OfflineMapInfo[],

    // Active offline map folder
    // Example: maps/map_1778981120461
    activeOfflineMapFolder: '',

    // Active offline map info
    activeOfflineMap: null as OfflineMapInfo | null,
  }),

  actions: {
    setMapMode(mode: MapMode) {
      // If user switches to offline, default to latest downloaded map
      if (mode === 'offline') {
        this.useLatestOfflineMap()
      }

      this.mapMode = mode
    },

    setOfflineMaps(maps: OfflineMapInfo[]) {
      this.offlineMaps = maps.sort(
        (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime(),
      )

      if (!this.activeOfflineMapFolder && this.offlineMaps.length > 0) {
        this.useLatestOfflineMap()
      }
    },

    useOfflineMap(mapInfo: OfflineMapInfo) {
      this.activeOfflineMap = mapInfo
      this.activeOfflineMapFolder = mapInfo.folderPath
      this.mapMode = 'offline'
    },

    useLatestOfflineMap() {
      if (this.offlineMaps.length === 0) {
        this.activeOfflineMap = null
        this.activeOfflineMapFolder = ''
        return
      }

      this.activeOfflineMap = this.offlineMaps[0]
      this.activeOfflineMapFolder = this.offlineMaps[0].folderPath
    },

    getTileServer() {
      switch (this.mapTileStyle) {
        case 'stadia_smooth':
          return {
            name: 'Stadia Smooth',
            tiles: ['https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png'],
            attribution: '&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap contributors',
            maxzoom: 19,
          }

        case 'stadia_dark':
          return {
            name: 'Stadia Dark',
            tiles: ['https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png'],
            attribution: '&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap contributors',
            maxzoom: 19,
          }

        case 'carto_dark':
          return {
            name: 'CARTO Dark',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
            maxzoom: 19,
          }

        case 'carto_light':
          return {
            name: 'CARTO Light',
            tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
            attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
            maxzoom: 19,
          }

        case 'satellite':
          return {
            name: 'Esri Satellite',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            attribution: '&copy; Esri',
            maxzoom: 19,
          }

        case 'osm_standard':
          return {
            name: 'OpenStreetMap',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            attribution: '&copy; OpenStreetMap Contributors',
            maxzoom: 19,
          }

        case 'hot':
          return {
            name: 'HOT',
            tiles: ['https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'],
            attribution: '&copy; OpenStreetMap contributors, HOT',
            maxzoom: 19,
          }

        case 'cyclosm':
          return {
            name: 'CyclOSM',
            tiles: ['https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'],
            attribution: '&copy; CyclOSM &copy; OpenStreetMap contributors',
            maxzoom: 19,
          }

        case 'topo':
          return {
            name: 'OpenTopoMap',
            tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
            attribution: '&copy; OpenTopoMap &copy; OpenStreetMap contributors',
            maxzoom: 17,
          }

        default:
          return {
            name: 'Stadia Dark',
            tiles: ['https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png'],
            attribution: '&copy; Stadia Maps &copy; OpenMapTiles &copy; OpenStreetMap contributors',
            maxzoom: 19,
          }
      }
    },

    getTileUrl(z: number, x: number, y: number) {
      const server = this.getTileServer()

      return server.tiles[0]
        .replace('{z}', String(z))
        .replace('{x}', String(x))
        .replace('{y}', String(y))
    },

    getMapStyle() {
      if (this.mapMode === 'offline') {
        return {
          version: 8,

          sources: {
            offlineTiles: {
              type: 'raster',
              tiles: ['offline://{z}/{x}/{y}.png'],
              tileSize: 256,
              minzoom: 0,
              maxzoom: 19,
            },
          },

          layers: [
            {
              id: 'offline-background',
              type: 'background',
              paint: {
                'background-color': '#121212',
              },
            },
            {
              id: 'offlineTiles',
              type: 'raster',
              source: 'offlineTiles',
            },
          ],
        }
      }

      const server = this.getTileServer()

      return {
        version: 8,

        sources: {
          osm: {
            type: 'raster',
            tiles: server.tiles,
            tileSize: 256,
            attribution: server.attribution,
            maxzoom: server.maxzoom,
          },
        },

        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      }
    },
  },
})
