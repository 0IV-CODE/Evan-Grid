<script lang="ts">
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { systemSt } from '@/stores/systemSt'

type DownloadStatus = 'not_downloaded' | 'downloading' | 'downloaded' | 'failed'

type DownloadMapArea = {
  id: string
  name: string
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  zoom: number
  progress: number
  status: DownloadStatus
  tileCount: number
  savedTileCount: number
}

type TileCoord = {
  z: number
  x: number
  y: number
  url: string
}

type SavedMapArea = {
  id: string
  name: string
  mapStyle: string
  tileServer: string
  zoom: number
  tileCount: number
  downloadedAt: string
  folderPath: string
}

type SelectedFolderView = {
  folderPath: string
  files: string[]
}

export default {
  name: 'MapAreas',

  data: () => ({
    systemSt: systemSt(),

    map: null as maplibregl.Map | null,
    selectedArea: null as DownloadMapArea | null,

    downloadedAreas: [] as SavedMapArea[],
    selectedFolderView: null as SelectedFolderView | null,

    downloadZoom: 16,

    // DEV LIMIT:
    // 22 x 22 = 484 tiles.
    //
    // PROD UPDATE:
    // Change this to 35 for 35 x 35 = 1,225 tiles.
    tileSquareSide: 22,

    concurrentDownloadLimit: 8,
    batchDelayMs: 150,

    mapsRootFolder: 'maps',

    lastError: '',
  }),

  computed: {
    selectedTileServer() {
      return this.systemSt.getTileServer()
    },

    canDownload() {
      return this.systemSt.mapMode === 'online'
    },

    downloadIsBlocked() {
      return !this.canDownload || this.selectedArea?.status === 'downloading'
    },
  },

  mounted() {
    this.createMap()
    this.loadDownloadedAreas()
  },

  beforeUnmount() {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  },

  methods: {
    createMap() {
      this.map = new maplibregl.Map({
        container: 'download-map',
        attributionControl: false,
        style: this.systemSt.getMapStyle(),
        center: [-86.8515, 21.1619],
        zoom: 8,
      })

      this.map.addControl(new maplibregl.NavigationControl(), 'top-right')

      this.map.on('load', () => {
        this.createFixedTileArea()
      })

      this.map.on('moveend', () => {
        this.createFixedTileArea()
      })
    },

    createFixedTileArea() {
      if (!this.map) return

      const center = this.map.getCenter()

      const centerTileX = this.lngToTileX(center.lng, this.downloadZoom)
      const centerTileY = this.latToTileY(center.lat, this.downloadZoom)

      const half = Math.floor(this.tileSquareSide / 2)

      const minX = centerTileX - half
      const maxX = centerTileX + half
      const minY = centerTileY - half
      const maxY = centerTileY + half

      const bounds = {
        west: this.tileXToLng(minX, this.downloadZoom),
        east: this.tileXToLng(maxX + 1, this.downloadZoom),
        north: this.tileYToLat(minY, this.downloadZoom),
        south: this.tileYToLat(maxY + 1, this.downloadZoom),
      }

      const tiles = this.getTilesFromTileGrid(minX, maxX, minY, maxY, this.downloadZoom)

      this.selectedArea = {
        id: 'selected_tile_area',
        name: 'Selected tile area',
        bounds,
        zoom: this.downloadZoom,
        progress: 0,
        status: 'not_downloaded',
        tileCount: tiles.length,
        savedTileCount: 0,
      }

      this.drawSelectedArea(this.selectedArea)
    },

    drawSelectedArea(area: DownloadMapArea) {
      if (!this.map) return

      const sourceId = 'download-area-source'
      const layerId = 'download-area-layer'
      const borderLayerId = 'download-area-border-layer'

      const geojson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [area.bounds.west, area.bounds.north],
                  [area.bounds.east, area.bounds.north],
                  [area.bounds.east, area.bounds.south],
                  [area.bounds.west, area.bounds.south],
                  [area.bounds.west, area.bounds.north],
                ],
              ],
            },
          },
        ],
      }

      const existingSource = this.map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined

      if (existingSource) {
        existingSource.setData(geojson as GeoJSON.FeatureCollection)
        return
      }

      this.map.addSource(sourceId, {
        type: 'geojson',
        data: geojson as GeoJSON.FeatureCollection,
      })

      this.map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': 0.22,
        },
      })

      this.map.addLayer({
        id: borderLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#ffffff',
          'line-width': 3,
        },
      })
    },

    lngToTileX(lng: number, zoom: number) {
      return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))
    },

    latToTileY(lat: number, zoom: number) {
      const latRad = (lat * Math.PI) / 180

      return Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom),
      )
    },

    tileXToLng(x: number, zoom: number) {
      return (x / Math.pow(2, zoom)) * 360 - 180
    },

    tileYToLat(y: number, zoom: number) {
      const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom)

      return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
    },

    getCurrentTiles() {
      if (!this.map) return []

      const center = this.map.getCenter()

      const centerTileX = this.lngToTileX(center.lng, this.downloadZoom)
      const centerTileY = this.latToTileY(center.lat, this.downloadZoom)

      const half = Math.floor(this.tileSquareSide / 2)

      return this.getTilesFromTileGrid(
        centerTileX - half,
        centerTileX + half,
        centerTileY - half,
        centerTileY + half,
        this.downloadZoom,
      )
    },

    getTilesFromTileGrid(
      minX: number,
      maxX: number,
      minY: number,
      maxY: number,
      zoom: number,
    ): TileCoord[] {
      const tiles: TileCoord[] = []

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tiles.push({
            z: zoom,
            x,
            y,
            url: this.systemSt.getTileUrl(zoom, x, y),
          })
        }
      }

      return tiles
    },

    async startDownload() {
      if (!this.selectedArea || !this.map) return

      if (this.downloadIsBlocked) {
        console.warn('Download blocked.')
        return
      }

      const area = this.selectedArea
      const tiles = this.getCurrentTiles()

      const areaId = `map_${Date.now()}`
      const folderPath = `${this.mapsRootFolder}/${areaId}`

      let savedTileCount = 0

      this.lastError = ''

      area.status = 'downloading'
      area.progress = 0
      area.tileCount = tiles.length
      area.savedTileCount = 0

      try {
        await this.ensureFolder(this.mapsRootFolder)
        await this.ensureFolder(folderPath)

        for (let i = 0; i < tiles.length; i += this.concurrentDownloadLimit) {
          const batch = tiles.slice(i, i + this.concurrentDownloadLimit)

          await Promise.all(
            batch.map(async (tile) => {
              try {
                const response = await fetch(tile.url)

                if (!response.ok) {
                  console.warn('Tile failed:', response.status, tile.url)
                  return
                }

                const blob = await response.blob()
                const base64 = await this.blobToBase64(blob)

                const tilePath = `${folderPath}/${tile.z}_${tile.x}_${tile.y}.png`

                await Filesystem.writeFile({
                  path: tilePath,
                  data: base64,
                  directory: Directory.External,
                  recursive: true,
                })

                savedTileCount++
                area.savedTileCount = savedTileCount
              } catch (error) {
                console.warn('Skipping failed tile:', tile.url, error)
              }
            }),
          )

          area.progress = Math.round((savedTileCount / tiles.length) * 100)

          await this.sleep(this.batchDelayMs)
        }

        if (savedTileCount === 0) {
          area.status = 'failed'
          area.progress = 0
          area.savedTileCount = 0

          this.lastError =
            'Download failed. The maps folder was created, but no tile files were saved.'

          console.error(this.lastError)
          return
        }

        const savedMap: SavedMapArea = {
          id: areaId,
          name: `Offline map ${this.downloadedAreas.length + 1}`,
          mapStyle: this.systemSt.mapTileStyle,
          tileServer: this.selectedTileServer.name,
          zoom: this.downloadZoom,
          tileCount: savedTileCount,
          downloadedAt: new Date().toISOString(),
          folderPath,
        }

        await Filesystem.writeFile({
          path: `${folderPath}/manifest.json`,
          data: JSON.stringify(savedMap, null, 2),
          directory: Directory.External,
          encoding: Encoding.UTF8,
          recursive: true,
        })

        const savedManifest = await Filesystem.stat({
          path: `${folderPath}/manifest.json`,
          directory: Directory.External,
        })

        console.log('Saved manifest URI:', savedManifest.uri)

        area.status = 'downloaded'
        area.progress = 100
        area.tileCount = savedTileCount
        area.savedTileCount = savedTileCount

        await this.loadDownloadedAreas()
        await this.openDownloadedFolder(savedMap)
      } catch (error) {
        console.error('Download failed:', error)

        area.status = 'failed'
        this.lastError = 'Download failed. Check Android permissions, internet, or tile server.'
      }
    },

    async loadDownloadedAreas() {
      try {
        await this.ensureFolder(this.mapsRootFolder)

        const result = await Filesystem.readdir({
          path: this.mapsRootFolder,
          directory: Directory.External,
        })

        console.log('Maps root files:', result.files)

        const areas: SavedMapArea[] = []

        for (const file of result.files) {
          const folderName = this.getFileName(file)

          if (!folderName) continue

          const manifestPath = `${this.mapsRootFolder}/${folderName}/manifest.json`

          try {
            const manifest = await Filesystem.readFile({
              path: manifestPath,
              directory: Directory.External,
              encoding: Encoding.UTF8,
            })

            const data = JSON.parse(String(manifest.data)) as SavedMapArea

            areas.push(data)
          } catch (error) {
            console.warn('Skipping map folder without valid manifest:', folderName, error)
          }
        }

        this.downloadedAreas = areas

        this.downloadedAreas = areas.sort(
          (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime(),
        )

        if (!this.systemSt.activeOfflineMapFolder && this.downloadedAreas.length > 0) {
          this.systemSt.activeOfflineMapFolder = this.downloadedAreas[0].folderPath
        }
      } catch (error) {
        console.warn('No downloaded maps found yet.', error)
        this.downloadedAreas = []
      }
    },

    async openDownloadedFolder(area: SavedMapArea) {
      try {
        const result = await Filesystem.readdir({
          path: area.folderPath,
          directory: Directory.External,
        })

        this.selectedFolderView = {
          folderPath: area.folderPath,
          files: result.files.map((file: any) => this.getFileName(file)).filter(Boolean),
        }

        console.log('Folder path:', area.folderPath)
        console.log('Files:', this.selectedFolderView.files)
      } catch (error) {
        console.error('Could not open folder:', error)

        this.selectedFolderView = {
          folderPath: area.folderPath,
          files: [],
        }
      }
    },

    async deleteDownloadedArea(area: SavedMapArea) {
      try {
        await Filesystem.rmdir({
          path: area.folderPath,
          directory: Directory.External,
          recursive: true,
        })

        if (this.selectedFolderView?.folderPath === area.folderPath) {
          this.selectedFolderView = null
        }

        await this.loadDownloadedAreas()
      } catch (error) {
        console.error('Could not delete downloaded map:', error)
      }
    },

    async ensureFolder(path: string) {
      try {
        await Filesystem.mkdir({
          path,
          directory: Directory.External,
          recursive: true,
        })
      } catch (error) {
        // Folder already exists. Safe to ignore.
      }
    },

    getFileName(file: any) {
      return typeof file === 'string' ? file : file?.name
    },

    blobToBase64(blob: Blob) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()

        reader.onerror = () => reject(reader.error)

        reader.onload = () => {
          const result = String(reader.result)
          const base64 = result.includes(',') ? result.split(',')[1] : result

          resolve(base64)
        }

        reader.readAsDataURL(blob)
      })
    },

    sleep(ms: number) {
      return new Promise((resolve) => window.setTimeout(resolve, ms))
    },

    formatDate(value: string) {
      return new Date(value).toLocaleDateString()
    },

    useOfflineMap(area: SavedMapArea) {
      this.systemSt.activeOfflineMapFolder = area.folderPath
      this.systemSt.setMapMode('offline')
    },
  },
}
</script>

<template>
  <v-card class="pa-0 mx-auto rounded-t-xl bg-primary" max-width="520" elevation="0">
    <v-card class="pa-4 border-b-sm bg-primary" flat rounded="0">
      <p class="text-subtitle-1 font-weight-bold ma-0">Download map area</p>

      <p class="text-caption text-grey-darken-1 mt-1 mb-0">
        Move the map. The rectangle shows the fixed tile square that will be saved to this phone.
      </p>

      <p class="text-grey-darken-1 mt-2 mb-0" style="font-size: 12px">
        Mode: <strong>{{ systemSt.mapMode }}</strong
        >, Selected map: <strong>{{ systemSt.mapTileStyle }}</strong>
      </p>
    </v-card>

    <v-alert v-if="!canDownload" class="ma-4" type="warning" variant="tonal">
      Switch to online mode before downloading map tiles.
    </v-alert>

    <v-alert v-if="lastError" class="ma-4" type="error" variant="tonal">
      {{ lastError }}
    </v-alert>

    <v-card class="ma-4 overflow-hidden" rounded="lg" elevation="2">
      <div id="download-map" style="width: 100%; height: 250px"></div>
    </v-card>

    <v-card v-if="selectedArea" class="ma-4 pa-2 border-sm" rounded="lg" elevation="0">
      <p class="text-body-2 font-weight-bold ma-0">
        {{ selectedArea.name }}
      </p>

      <p class="text-grey-darken-1 mt-1 mb-0" style="font-size: 12px">
        Tiles :
        <strong>{{ selectedArea.savedTileCount }} / {{ selectedArea.tileCount }}</strong>
      </p>

      <p
        v-if="selectedArea.status === 'downloading'"
        class="text-grey-darken-1 mt-2 mb-0"
        style="font-size: 12px"
      >
        Download progress: {{ selectedArea.progress }}%
      </p>

      <p class="text-caption text-grey-darken-1 mt-2 mb-0" style="font-size: 12px">
        Status:
        <strong>{{ selectedArea.status.replace('_', ' ') }}</strong>
      </p>

      <div class="d-flex ga-2 mt-3">
        <v-btn
          color="primary"
          size="small"
          variant="flat"
          :disabled="downloadIsBlocked"
          @click="startDownload"
        >
          Download selected area
        </v-btn>
      </div>
    </v-card>

    <v-card
      class="ma-4 pa-3 border-sm bg-transparent"
      rounded="lg"
      elevation="0"
      height="350"
      style="overflow-y: auto"
    >
      <div class="d-flex align-center justify-space-between">
        <p class="text-body-2 font-weight-bold ma-0">Downloaded maps</p>

        <v-btn size="small" variant="tonal" @click="loadDownloadedAreas"> Refresh </v-btn>
      </div>

      <p
        v-if="downloadedAreas.length === 0"
        class="text-grey-darken-1 mt-2 mb-0"
        style="font-size: 12px"
      >
        No maps downloaded yet.
      </p>

      <v-card
        v-for="area in downloadedAreas"
        :key="area.id"
        class="mt-3 pa-3"
        rounded="lg"
        elevation="0"
      >
        <p class="text-body-2 font-weight-bold ma-0">
          {{ area.name }}
        </p>

        <p class="text-grey-darken-1 mt-1 mb-0" style="font-size: 12px">
          Style: {{ area.mapStyle }}, Tiles: {{ area.tileCount }} , Downloaded:
          {{ formatDate(area.downloadedAt) }}
        </p>

        <p class="text-grey-darken-1 mt-0 mb-0" style="font-size: 12px">
          Folder:
          <strong>Android/data/com.ivcode.evangrid/files/{{ area.folderPath }}</strong>
        </p>

        <div class="d-flex ga-2 mt-2">
          <v-btn color="primary" variant="tonal" @click="openDownloadedFolder(area)"> Files </v-btn>
          <v-btn color="green" variant="tonal" @click="useOfflineMap(area)"> Use offline </v-btn>
          <v-btn color="red" variant="tonal" @click="deleteDownloadedArea(area)"> Delete </v-btn>
        </div>
      </v-card>
    </v-card>

    <v-card v-if="selectedFolderView" class="ma-4 pa-3 border-sm" rounded="lg" elevation="0">
      <p class="text-body-2 font-weight-bold ma-0">Folder files</p>

      <p class="text-grey-darken-1 mt-2 mb-0" style="font-size: 12px">
        Path:
        <strong>Android/data/com.ivcode.evangrid/files/{{ selectedFolderView.folderPath }}</strong>
      </p>

      <p
        v-if="selectedFolderView.files.length === 0"
        class="text-grey-darken-1 mt-2 mb-0"
        style="font-size: 12px"
      >
        No files found.
      </p>
    </v-card>
  </v-card>
</template>
