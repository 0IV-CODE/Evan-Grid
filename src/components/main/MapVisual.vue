<script lang="ts">
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  mdiHome,
  mdiHomeAlertOutline,
  mdiHomeAccount,
  mdiHomeAnalytics,
  mdiHomeAutomation,
  mdiHomeClockOutline,
  mdiHomeFlood,
  mdiHomeOff,
  mdiHomeLightningBoltOutline,
  mdiHomeLock,
  mdiHomeLockOpen,
} from '@mdi/js'
import { systemSt } from '@/stores/systemSt.js'
import { Directory, Filesystem } from '@capacitor/filesystem'

import { evangridMapDb } from '@/db/evangridMapDb'

/*
  MapVisual.vue

  Purpose:
  - Shows the MapLibre map.
  - Lets the user add/edit houses, zones, straight lines, text, and chained-dot lines.
  - Saves map objects locally with Dexie.
  - Supports online/offline map styles through systemSt.

  Cleanup notes:
  - Keep all map layer names in one component for now. Later, this file should be split into
    smaller composables such as useMapZones, useMapHouses, useMapLines, and useMapStorage.
  - MapLibre removes custom layers/sources when setStyle() runs, so the watcher re-adds them.
  - Houses use DOM markers, while zones/lines/text use GeoJSON layers. That is normal here.
*/

// Single MapLibre instance used by this component.
// Kept outside Vue reactivity because MapLibre objects should not be deeply reactive.
let map: maplibregl.Map | null = null

// Current tool/mode selected by the user.
type Mode = 'none' | 'add_house' | 'add_zone' | 'add_arrow' | 'add_text' | 'add_line'

// Icons the user can assign to a house marker.
type HouseIcon =
  | 'Home'
  | 'HomeAlertOutline'
  | 'HomeAccount'
  | 'HomeAnalytics'
  | 'HomeAutomation'
  | 'HomeClockOutline'
  | 'HomeFlood'
  | 'HomeOff'
  | 'HomeLightningBoltOutline'
  | 'HomeLock'
  | 'HomeLockOpen'

// Status controls the house marker color.
type HouseStatus =
  | 'new'
  | 'visited'
  | 'not_home'
  | 'follow_up'
  | 'interested'
  | 'bible_study'
  | 'saved'
  | 'member'
  | 'home_church'
  | 'do_not_return'
  | 'danger'
  | 'moved'
  | 'inactive'
// Zone handles: four resize corners plus one rotate handle.
type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'rotate'
type ZoneShape = 'square' | 'rectangle' | 'circle'

// Handle types for straight lines and text labels.
type ArrowHandleKind = 'move' | 'resize' | 'rotate'
type TextHandleKind = 'move' | 'rotate'

type House = {
  id: string
  name: string
  address: string
  lng: number
  lat: number
  status: HouseStatus
  language: string
  notes: string
  icon: HouseIcon
  locked: boolean
  marker?: maplibregl.Marker
}

type Zone = {
  id: string
  name: string
  color: string
  notes: string
  shape: ZoneShape
  centerLng: number
  centerLat: number
  width: number
  height: number
  // Rotation is stored in degrees. 0 means no rotation.
  rotation: number
  locked: boolean
  coordinates: number[][][]
}

type ArrowItem = {
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

type TextItem = {
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

type LinePoint = {
  id: string
  name: string
  lng: number
  lat: number
}

type ContinuousLine = {
  id: string
  name: string
  color: string
  notes: string
  locked: boolean
  points: LinePoint[]
}

export default {
  name: 'MapVisual',

  data: () => ({
    // Global app/map settings from Pinia.
    systemSt: systemSt(),

    // Active add/edit tool. When mode is 'none', the bottom bar shows add buttons.
    mode: 'none' as Mode,

    // Fullscreen edit dialogs. Each object type has its own dialog.
    houseDialog: false,
    zoneDialog: false,
    arrowDialog: false,
    textDialog: false,
    lineDialog: false,

    // Temporary edit copies. These prevent half-edited form values from immediately changing saved data.
    editingHouse: null as House | null,
    editingZone: null as Zone | null,
    editingArrow: null as ArrowItem | null,
    editingText: null as TextItem | null,
    editingLine: null as ContinuousLine | null,

    // Selected IDs control which object shows handles on the map.
    selectedHouseId: '',
    selectedZoneId: '',
    selectedArrowId: '',
    selectedTextId: '',
    selectedLineId: '',

    // Pointer/drag state. Only one of these should be true at a time.
    isDraggingZone: false,
    isResizingZone: false,
    isRotatingZone: false,
    activeHandle: null as ResizeHandle | null,
    dragStartLng: 0,
    dragStartLat: 0,
    dragStartZone: null as Zone | null,

    isDraggingLinePoint: false,
    draggingLineId: '',
    draggingLinePointIndex: -1,

    isDraggingArrowHandle: false,
    activeArrowHandle: '' as ArrowHandleKind | '',
    draggingArrowId: '',

    isDraggingTextHandle: false,
    activeTextHandle: '' as TextHandleKind | '',
    draggingTextId: '',

    // Initial map camera position. Change this to your default service area.
    defaultStartLocation: {
      lng: -87.449,
      lat: 20.212,
      zoom: 13,
    },

    // Dropdown options for object forms.
    houseIconItems: [
      'Home',
      'HomeAlertOutline',
      'HomeAccount',
      'HomeAnalytics',
      'HomeAutomation',
      'HomeClockOutline',
      'HomeFlood',
      'HomeOff',
      'HomeLightningBoltOutline',
      'HomeLock',
      'HomeLockOpen',
    ] as HouseIcon[],
    zoneShapeItems: ['square', 'rectangle', 'circle'] as ZoneShape[],

    // In-memory map objects. Dexie is the source for persistent local storage.
    houses: [] as House[],
    zones: [] as Zone[],
    arrows: [] as ArrowItem[],
    textItems: [] as TextItem[],
    lines: [] as ContinuousLine[],
  }),

  computed: {
    // Simple mode checks used by the toolbar and dialogs.
    isAddingHouse() {
      return this.mode === 'add_house'
    },

    isAddingZone() {
      return this.mode === 'add_zone'
    },

    isAddingArrow() {
      return this.mode === 'add_arrow'
    },

    isAddingText() {
      return this.mode === 'add_text'
    },

    isAddingLine() {
      return this.mode === 'add_line'
    },

    hintText() {
      if (this.isAddingHouse) return 'House Edit: drag the house, then open controls.'
      if (this.isAddingZone)
        return 'Zone Edit: drag, resize with white corners, or rotate with purple dot.'
      if (this.isAddingArrow)
        return 'Straight Line Edit: blue dot moves the line, orange dot changes length, purple dot rotates.'
      if (this.isAddingText) return 'Text Edit: blue dot moves text, purple dot rotates text.'
      if (this.isAddingLine)
        return 'Chained Dot Line Edit: click the map to add connected dots. Drag dots to move each point.'
      return ''
    },
  },

  methods: {
    // ---------------------------------------------------------------------------
    // Offline tile loading
    // ---------------------------------------------------------------------------
    setupOfflineTileProtocol() {
      if ((window as any).__offlineProtocolLoaded) return
      ;(window as any).__offlineProtocolLoaded = true

      maplibregl.addProtocol('offline', async (params) => {
        const folder = this.systemSt.activeOfflineMapFolder

        if (!folder) {
          console.error('No active offline map folder selected.')
          return { data: new Uint8Array().buffer }
        }

        const cleanUrl = params.url.replace('offline://', '').replace('.png', '')
        const [z, x, y] = cleanUrl.split('/')

        const tilePath = `${folder}/${z}_${x}_${y}.png`

        try {
          console.log('Loading offline tile:', tilePath)

          const file = await Filesystem.readFile({
            path: tilePath,
            directory: Directory.External,
          })

          const base64 = String(file.data)
          const binary = window.atob(base64)
          const bytes = new Uint8Array(binary.length)

          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
          }

          return {
            data: bytes.buffer,
          }
        } catch (error) {
          console.error('Missing offline tile:', tilePath, error)

          return {
            data: new Uint8Array().buffer,
          }
        }
      })
    },

    // ---------------------------------------------------------------------------
    // Map setup
    // ---------------------------------------------------------------------------

    initMap() {
      this.zones = this.zones.map((zone) => this.makeZone(zone))

      map = new maplibregl.Map({
        container: 'map',
        attributionControl: false,
        style: this.systemSt.getMapStyle() as any,
        center: [this.defaultStartLocation.lng, this.defaultStartLocation.lat],
        zoom: this.defaultStartLocation.zoom,
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-right')
      map.addControl(new maplibregl.FullscreenControl(), 'top-right')

      map.on('load', () => {
        this.addZoneLayers()
        this.addZoneHandleLayer()

        this.addLineLayers()

        this.addArrowLayers()
        this.addArrowHandleLayers()

        this.addTextLayers()
        this.addTextHandleLayers()

        this.drawHouseMarkers()
        this.refreshArrows()
        this.refreshText()
        this.refreshLines()

        this.addMapEvents()
      })
    },

    // Registers all MapLibre click/drag events after the map and layers are loaded.
    addMapEvents() {
      if (!map) return

      map.on('click', this.onMapClick)

      map.on('click', 'zone-fills', this.onZoneClick)
      map.on('mousedown', 'zone-fills', this.startZoneDrag)
      map.on('touchstart', 'zone-fills', this.startZoneDrag)
      map.on('mousedown', 'zone-handles', this.startZoneResize)
      map.on('touchstart', 'zone-handles', this.startZoneResize)

      map.on('click', 'line-point-handles', this.onLinePointClick)
      map.on('mousedown', 'line-point-handles', this.startLinePointDrag)
      map.on('touchstart', 'line-point-handles', this.startLinePointDrag)

      map.on('click', 'arrow-lines', this.onArrowClick)
      map.on('mousedown', 'arrow-handles', this.startArrowHandleDrag)
      map.on('touchstart', 'arrow-handles', this.startArrowHandleDrag)

      map.on('click', 'map-text-layer', this.onTextClick)
      map.on('mousedown', 'text-handles', this.startTextHandleDrag)
      map.on('touchstart', 'text-handles', this.startTextHandleDrag)

      map.on('mousemove', this.movePointer)
      map.on('touchmove', this.movePointer)

      map.on('mouseup', this.stopPointer)
      map.on('touchend', this.stopPointer)
    },

    // ---------------------------------------------------------------------------
    // Add-mode handlers
    // ---------------------------------------------------------------------------

    // In chained-dot mode, each map click adds a new point to the selected line.
    onMapClick(event: maplibregl.MapMouseEvent) {
      if (!this.isAddingLine) return

      const line = this.findLine(this.selectedLineId)
      if (!line || line.locked) return

      line.points.push({
        id: crypto.randomUUID(),
        name: `Point ${line.points.length + 1}`,
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      })

      this.refreshLines()
    },

    // Creates a new house at the map center and unlocks it for dragging.
    openAddHouseMode() {
      if (!map) return

      const center = map.getCenter()

      const house: House = {
        id: crypto.randomUUID(),
        name: 'New House',
        address: '',
        lng: center.lng,
        lat: center.lat,
        status: 'new',
        language: 'Spanish',
        notes: '',
        icon: 'Home',
        locked: false,
      }

      this.houses.push(house)
      this.mode = 'add_house'
      this.selectedHouseId = house.id
      this.selectedZoneId = ''
      this.selectedArrowId = ''
      this.selectedTextId = ''
      this.selectedLineId = ''

      this.drawHouseMarkers()
    },

    // Creates a new rectangular zone at the map center.
    openAddZoneMode() {
      if (!map) return

      const center = map.getCenter()

      const zone = this.makeZone({
        id: crypto.randomUUID(),
        name: 'New Zone',
        color: '#1976d2',
        notes: '',
        shape: 'rectangle',
        centerLng: center.lng,
        centerLat: center.lat,
        width: 0.006,
        height: 0.004,
        rotation: 0,
        locked: false,
        coordinates: [],
      })

      this.zones.push(zone)
      this.mode = 'add_zone'
      this.selectedZoneId = zone.id
      this.selectedHouseId = ''
      this.selectedArrowId = ''
      this.selectedTextId = ''
      this.selectedLineId = ''

      this.refreshZones()
    },

    // Creates a new straight line at the map center.
    openAddArrowMode() {
      if (!map) return

      const center = map.getCenter()

      const arrow: ArrowItem = {
        id: crypto.randomUUID(),
        name: 'New Straight Line',
        lng: center.lng,
        lat: center.lat,
        color: '#000000',
        length: 110,
        rotation: 0,
        notes: '',
        locked: false,
      }

      this.arrows.push(arrow)
      this.mode = 'add_arrow'
      this.selectedArrowId = arrow.id
      this.selectedHouseId = ''
      this.selectedZoneId = ''
      this.selectedTextId = ''
      this.selectedLineId = ''

      this.refreshArrows()
      this.refreshText()
    },

    // Creates a new text label at the map center.
    openAddTextMode() {
      if (!map) return

      const center = map.getCenter()

      const text: TextItem = {
        id: crypto.randomUUID(),
        name: 'New Text',
        text: 'Text',
        lng: center.lng,
        lat: center.lat,
        color: '#000000',
        fontSize: 22,
        rotation: 0,
        notes: '',
        locked: false,
      }

      this.textItems.push(text)
      this.mode = 'add_text'
      this.selectedTextId = text.id
      this.selectedHouseId = ''
      this.selectedZoneId = ''
      this.selectedArrowId = ''
      this.selectedLineId = ''

      this.refreshText()
      this.refreshArrows()
    },

    // Starts a new chained-dot line. Points are added by clicking the map.
    openAddLineMode() {
      const line: ContinuousLine = {
        id: crypto.randomUUID(),
        name: 'New Line',
        color: '#000000',
        notes: '',
        locked: false,
        points: [],
      }

      this.lines.push(line)
      this.mode = 'add_line'
      this.selectedLineId = line.id
      this.selectedHouseId = ''
      this.selectedZoneId = ''
      this.selectedArrowId = ''
      this.selectedTextId = ''

      this.refreshLines()
    },

    // ---------------------------------------------------------------------------
    // Dialog open/close helpers
    // ---------------------------------------------------------------------------

    openSelectedHouseDetails() {
      const house = this.findHouse(this.selectedHouseId)
      if (house) this.openHouseDetails(house)
    },

    openSelectedZoneDetails() {
      const zone = this.findZone(this.selectedZoneId)
      if (zone) this.openZoneDetails(zone)
    },

    openSelectedArrowDetails() {
      const arrow = this.findArrow(this.selectedArrowId)
      if (arrow) this.openArrowDetails(arrow)
    },

    openSelectedTextDetails() {
      const text = this.findText(this.selectedTextId)
      if (text) this.openTextDetails(text)
    },

    openSelectedLineDetails() {
      const line = this.findLine(this.selectedLineId)
      if (line) this.openLineDetails(line)
    },

    openHouseDetails(house: House) {
      this.selectedHouseId = house.id
      this.editingHouse = { ...house, marker: undefined }
      this.houseDialog = true
    },

    openZoneDetails(zone: Zone) {
      this.selectedZoneId = zone.id
      this.editingZone = JSON.parse(JSON.stringify(zone))
      this.zoneDialog = true
      this.refreshZoneHandles()
    },

    openArrowDetails(arrow: ArrowItem) {
      this.selectedArrowId = arrow.id
      this.editingArrow = { ...arrow }
      this.arrowDialog = true
      this.refreshArrows()
    },

    openTextDetails(text: TextItem) {
      this.selectedTextId = text.id
      this.editingText = { ...text }
      this.textDialog = true
      this.refreshText()
    },

    openLineDetails(line: ContinuousLine) {
      this.selectedLineId = line.id
      this.editingLine = JSON.parse(JSON.stringify(line))
      this.lineDialog = true
    },

    closeDialogOnly() {
      this.houseDialog = false
      this.zoneDialog = false
      this.arrowDialog = false
      this.textDialog = false
      this.lineDialog = false

      this.editingHouse = null
      this.editingZone = null
      this.editingArrow = null
      this.editingText = null
      this.editingLine = null
    },

    // ---------------------------------------------------------------------------
    // Save handlers
    // ---------------------------------------------------------------------------

    async saveHouse() {
      if (!this.editingHouse) return

      const house = this.findHouse(this.editingHouse.id)
      if (!house) return

      Object.assign(house, {
        ...this.editingHouse,
        locked: true,
        marker: house.marker,
      })

      await this.saveHouseToDb(house)

      this.mode = 'none'
      this.houseDialog = false
      this.editingHouse = null

      this.drawHouseMarkers()
    },

    async saveZone() {
      if (!this.editingZone) return

      const zone = this.findZone(this.editingZone.id)
      if (!zone) return

      Object.assign(zone, this.makeZone({ ...this.editingZone, locked: true }))

      await this.saveZoneToDb(zone)

      this.mode = 'none'
      this.zoneDialog = false
      this.editingZone = null

      this.refreshZones()
    },

    async saveArrow() {
      if (!this.editingArrow) return

      const arrow = this.findArrow(this.editingArrow.id)
      if (!arrow) return

      Object.assign(arrow, {
        ...this.editingArrow,
        locked: true,
      })

      await this.saveArrowToDb(arrow)

      this.mode = 'none'
      this.arrowDialog = false
      this.editingArrow = null

      this.refreshArrows()
    },

    async saveText() {
      if (!this.editingText) return

      const text = this.findText(this.editingText.id)
      if (!text) return

      Object.assign(text, {
        ...this.editingText,
        locked: true,
      })

      await this.saveTextToDb(text)

      this.mode = 'none'
      this.textDialog = false
      this.editingText = null

      this.refreshText()
    },

    async saveLine() {
      if (!this.editingLine) return

      const line = this.findLine(this.editingLine.id)
      if (!line) return

      Object.assign(line, {
        ...this.editingLine,
        locked: true,
      })

      await this.saveLineToDb(line)

      this.mode = 'none'
      this.lineDialog = false
      this.editingLine = null

      this.refreshLines()
    },

    // ---------------------------------------------------------------------------
    // Edit-position handlers
    // ---------------------------------------------------------------------------

    editHousePosition() {
      if (!this.editingHouse) return

      const house = this.findHouse(this.editingHouse.id)
      if (!house) return

      house.locked = false
      this.mode = 'add_house'
      this.selectedHouseId = house.id
      this.houseDialog = false

      this.drawHouseMarkers()
    },

    editZonePosition() {
      if (!this.editingZone) return

      const zone = this.findZone(this.editingZone.id)
      if (!zone) return

      zone.locked = false
      this.mode = 'add_zone'
      this.selectedZoneId = zone.id
      this.zoneDialog = false

      this.refreshZones()
    },

    editArrowPosition() {
      if (!this.editingArrow) return

      const arrow = this.findArrow(this.editingArrow.id)
      if (!arrow) return

      arrow.locked = false
      this.mode = 'add_arrow'
      this.selectedArrowId = arrow.id
      this.arrowDialog = false

      this.refreshArrows()
    },

    editTextPosition() {
      if (!this.editingText) return

      const text = this.findText(this.editingText.id)
      if (!text) return

      text.locked = false
      this.mode = 'add_text'
      this.selectedTextId = text.id
      this.textDialog = false

      this.refreshText()
    },

    editLinePosition() {
      if (!this.editingLine) return

      const line = this.findLine(this.editingLine.id)
      if (!line) return

      line.locked = false
      this.mode = 'add_line'
      this.selectedLineId = line.id
      this.lineDialog = false

      this.refreshLines()
    },

    // ---------------------------------------------------------------------------
    // Delete handlers
    // ---------------------------------------------------------------------------

    async deleteHouse() {
      if (!this.editingHouse) return

      const id = this.editingHouse.id
      const house = this.findHouse(id)

      house?.marker?.remove()

      this.houses = this.houses.filter((item) => item.id !== id)

      await this.deleteHouseFromDb(id)

      this.mode = 'none'
      this.houseDialog = false
      this.editingHouse = null
      this.selectedHouseId = ''

      this.drawHouseMarkers()
    },

    async deleteZone() {
      if (!this.editingZone) return

      const id = this.editingZone.id

      this.zones = this.zones.filter((item) => item.id !== id)

      await this.deleteZoneFromDb(id)

      this.mode = 'none'
      this.zoneDialog = false
      this.editingZone = null
      this.selectedZoneId = ''

      this.refreshZones()
    },

    async deleteArrow() {
      if (!this.editingArrow) return

      const id = this.editingArrow.id

      this.arrows = this.arrows.filter((item) => item.id !== id)

      await this.deleteArrowFromDb(id)

      this.mode = 'none'
      this.arrowDialog = false
      this.editingArrow = null
      this.selectedArrowId = ''

      this.refreshArrows()
    },

    async deleteText() {
      if (!this.editingText) return

      const id = this.editingText.id

      this.textItems = this.textItems.filter((item) => item.id !== id)

      await this.deleteTextFromDb(id)

      this.mode = 'none'
      this.textDialog = false
      this.editingText = null
      this.selectedTextId = ''

      this.refreshText()
    },

    async deleteLine() {
      if (!this.editingLine) return

      const id = this.editingLine.id

      this.lines = this.lines.filter((item) => item.id !== id)

      await this.deleteLineFromDb(id)

      this.mode = 'none'
      this.lineDialog = false
      this.editingLine = null
      this.selectedLineId = ''

      this.refreshLines()
    },

    // ---------------------------------------------------------------------------
    // Map object click/drag handlers
    // ---------------------------------------------------------------------------

    onZoneShapeChange() {
      if (!this.editingZone) return

      const zone = this.findZone(this.editingZone.id)
      if (!zone) return

      Object.assign(zone, this.makeZone(this.editingZone))

      this.refreshZones()
    },

    onArrowClick(event: maplibregl.MapMouseEvent) {
      const arrowId = event.features?.[0]?.properties?.id
      const arrow = this.findArrow(arrowId)

      if (!arrow) return

      event.preventDefault()
      this.openArrowDetails(arrow)
    },

    onTextClick(event: maplibregl.MapMouseEvent) {
      const textId = event.features?.[0]?.properties?.id
      const text = this.findText(textId)

      if (!text) return

      event.preventDefault()
      this.openTextDetails(text)
    },

    startArrowHandleDrag(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (!map) return

      const arrowId = event.features?.[0]?.properties?.id
      const kind = event.features?.[0]?.properties?.kind as ArrowHandleKind
      const arrow = this.findArrow(arrowId)

      if (!arrow || arrow.locked) return

      event.preventDefault()

      this.selectedArrowId = arrow.id
      this.draggingArrowId = arrow.id
      this.activeArrowHandle = kind
      this.isDraggingArrowHandle = true

      map.dragPan.disable()
      map.touchZoomRotate.disable()
    },

    startTextHandleDrag(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (!map) return

      const textId = event.features?.[0]?.properties?.id
      const kind = event.features?.[0]?.properties?.kind as TextHandleKind
      const text = this.findText(textId)

      if (!text || text.locked) return

      event.preventDefault()

      this.selectedTextId = text.id
      this.draggingTextId = text.id
      this.activeTextHandle = kind
      this.isDraggingTextHandle = true

      map.dragPan.disable()
      map.touchZoomRotate.disable()
    },

    dragArrowHandle(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (!map) return

      const arrow = this.findArrow(this.draggingArrowId)
      if (!arrow) return

      if (this.activeArrowHandle === 'move') {
        arrow.lng = event.lngLat.lng
        arrow.lat = event.lngLat.lat
      }

      if (this.activeArrowHandle === 'resize') {
        const startPixel = map.project([arrow.lng, arrow.lat])
        const pointerPixel = map.project([event.lngLat.lng, event.lngLat.lat])

        const dx = pointerPixel.x - startPixel.x
        const dy = pointerPixel.y - startPixel.y

        arrow.length = Math.max(30, Math.sqrt(dx * dx + dy * dy))
        arrow.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
      }

      if (this.activeArrowHandle === 'rotate') {
        const startPixel = map.project([arrow.lng, arrow.lat])
        const pointerPixel = map.project([event.lngLat.lng, event.lngLat.lat])

        const dx = pointerPixel.x - startPixel.x
        const dy = pointerPixel.y - startPixel.y

        arrow.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
      }

      this.refreshArrows()
    },

    dragTextHandle(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (!map) return

      const text = this.findText(this.draggingTextId)
      if (!text) return

      if (this.activeTextHandle === 'move') {
        text.lng = event.lngLat.lng
        text.lat = event.lngLat.lat
      }

      if (this.activeTextHandle === 'rotate') {
        const centerPixel = map.project([text.lng, text.lat])
        const pointerPixel = map.project([event.lngLat.lng, event.lngLat.lat])

        const dx = pointerPixel.x - centerPixel.x
        const dy = pointerPixel.y - centerPixel.y

        text.rotation = Math.atan2(dy, dx) * (180 / Math.PI)
      }

      this.refreshText()
    },

    startZoneDrag(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (!map) return

      const zoneId = event.features?.[0]?.properties?.id
      const zone = this.findZone(zoneId)

      if (!zone || zone.locked) return
      if (this.isAddingHouse) return
      if (this.isAddingZone && zone.id !== this.selectedZoneId) return

      event.preventDefault()

      this.selectedZoneId = zone.id
      this.isDraggingZone = true
      this.dragStartLng = event.lngLat.lng
      this.dragStartLat = event.lngLat.lat
      this.dragStartZone = JSON.parse(JSON.stringify(zone))

      map.dragPan.disable()
      map.touchZoomRotate.disable()
    },

    startZoneResize(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (!map) return

      const zoneId = event.features?.[0]?.properties?.zoneId
      const zone = this.findZone(zoneId)

      if (!zone || zone.locked) return
      if (this.isAddingHouse) return
      if (this.isAddingZone && zone.id !== this.selectedZoneId) return

      event.preventDefault()

      this.selectedZoneId = zone.id
      this.activeHandle = event.features?.[0]?.properties?.name as ResizeHandle

      if (this.activeHandle === 'rotate') {
        this.isRotatingZone = true
      } else {
        this.isResizingZone = true
      }

      map.dragPan.disable()
      map.touchZoomRotate.disable()
    },

    startLinePointDrag(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (!map) return

      const lineId = event.features?.[0]?.properties?.lineId
      const pointIndex = Number(event.features?.[0]?.properties?.pointIndex)
      const line = this.findLine(lineId)

      if (!line || line.locked) return

      event.preventDefault()

      this.isDraggingLinePoint = true
      this.draggingLineId = line.id
      this.draggingLinePointIndex = pointIndex

      map.dragPan.disable()
      map.touchZoomRotate.disable()
    },

    movePointer(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (this.isDraggingZone) this.dragZone(event)
      if (this.isResizingZone) this.resizeZone(event)
      if (this.isRotatingZone) this.rotateZone(event)
      if (this.isDraggingLinePoint) this.dragLinePoint(event)
      if (this.isDraggingArrowHandle) this.dragArrowHandle(event)
      if (this.isDraggingTextHandle) this.dragTextHandle(event)
    },

    dragZone(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (!this.dragStartZone) return

      const zone = this.findZone(this.selectedZoneId)
      if (!zone) return

      zone.centerLng = this.dragStartZone.centerLng + (event.lngLat.lng - this.dragStartLng)
      zone.centerLat = this.dragStartZone.centerLat + (event.lngLat.lat - this.dragStartLat)

      Object.assign(zone, this.makeZone(zone))
      this.refreshZones()
    },

    resizeZone(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (!this.activeHandle) return

      const zone = this.findZone(this.selectedZoneId)
      if (!zone) return

      const localPointer = this.getLocalZonePointer(zone, event)

      const minSize = 0.0005

      let nextWidth = Math.max(Math.abs(localPointer.x) * 2, minSize)
      let nextHeight = Math.max(Math.abs(localPointer.y) * 2, minSize)

      // Keep square and circle locked to equal width/height
      if (zone.shape === 'square' || zone.shape === 'circle') {
        const size = Math.max(nextWidth, nextHeight)
        nextWidth = size
        nextHeight = size
      }

      zone.width = nextWidth
      zone.height = nextHeight

      Object.assign(zone, this.makeZone(zone))
      this.refreshZones()
    },

    rotateZone(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      if (!map) return

      const zone = this.findZone(this.selectedZoneId)
      if (!zone) return

      const centerPixel = map.project([zone.centerLng, zone.centerLat])
      const pointerPixel = map.project([event.lngLat.lng, event.lngLat.lat])

      const dx = pointerPixel.x - centerPixel.x
      const dy = pointerPixel.y - centerPixel.y

      zone.rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90

      Object.assign(zone, this.makeZone(zone))
      this.refreshZones()
    },

    dragLinePoint(event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      const line = this.findLine(this.draggingLineId)
      if (!line) return

      const point = line.points[this.draggingLinePointIndex]
      if (!point) return

      point.lng = event.lngLat.lng
      point.lat = event.lngLat.lat

      this.refreshLines()
    },

    stopPointer() {
      if (!map) return

      this.isDraggingZone = false
      this.isResizingZone = false
      this.isRotatingZone = false
      this.isDraggingLinePoint = false
      this.isDraggingArrowHandle = false
      this.isDraggingTextHandle = false

      this.activeHandle = null
      this.activeArrowHandle = ''
      this.activeTextHandle = ''

      this.dragStartZone = null
      this.draggingLineId = ''
      this.draggingLinePointIndex = -1
      this.draggingArrowId = ''
      this.draggingTextId = ''

      map.dragPan.enable()
      map.touchZoomRotate.enable()
    },

    // ---------------------------------------------------------------------------
    // House DOM markers
    // ---------------------------------------------------------------------------

    drawHouseMarkers() {
      if (!map) return

      this.houses.forEach((house) => {
        house.marker?.remove()

        const el = this.makeHouseMarkerElement(house)

        const marker = new maplibregl.Marker({
          element: el,
          draggable: !house.locked,
        })
          .setLngLat([house.lng, house.lat])
          .addTo(map!)

        marker.on('dragend', () => {
          const point = marker.getLngLat()
          house.lng = point.lng
          house.lat = point.lat
        })

        el.addEventListener('click', (event) => {
          event.stopPropagation()

          if (this.isAddingZone) return
          if (this.isAddingHouse && house.id !== this.selectedHouseId) return

          this.openHouseDetails(house)
        })

        house.marker = marker
      })
    },

    makeHouseMarkerElement(house: House) {
      const el = document.createElement('div')
      el.style.display = 'flex'
      el.style.flexDirection = 'column'
      el.style.alignItems = 'center'
      el.style.cursor = 'pointer'
      el.style.userSelect = 'none'

      const iconWrap = document.createElement('div')
      iconWrap.style.width = '38px'
      iconWrap.style.height = '38px'
      iconWrap.style.display = 'grid'
      iconWrap.style.placeItems = 'center'
      iconWrap.style.borderRadius = '999px'
      iconWrap.style.background = 'white'
      iconWrap.style.border = '2px solid white'
      iconWrap.style.boxShadow = '0 2px 8px rgba(0,0,0,.28)'

      iconWrap.innerHTML = `
        <svg viewBox="0 0 24 24" width="30" height="30">
          <path fill="${this.getHouseColor(house.status)}" d="${this.getHouseIcon(house.icon)}" />
        </svg>
      `

      const label = document.createElement('div')
      label.innerText = house.name || 'House'
      label.style.marginTop = '4px'
      label.style.padding = '2px 6px'
      label.style.fontSize = '12px'
      label.style.fontWeight = '600'
      label.style.lineHeight = '1'
      label.style.whiteSpace = 'nowrap'
      label.style.borderRadius = '8px'
      label.style.background = 'rgba(255,255,255,.95)'
      label.style.boxShadow = '0 1px 4px rgba(0,0,0,.18)'
      label.style.color = '#111'

      el.appendChild(iconWrap)
      el.appendChild(label)

      return el
    },

    // ---------------------------------------------------------------------------
    // MapLibre layer/source setup
    // ---------------------------------------------------------------------------

    addZoneLayers() {
      if (!map) return

      map.addSource('zones', {
        type: 'geojson',
        data: this.zonesToGeoJson() as any,
      })

      map.addSource('zone-labels', {
        type: 'geojson',
        data: this.zoneLabelsToGeoJson() as any,
      })

      map.addLayer({
        id: 'zone-fills',
        type: 'fill',
        source: 'zones',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.08,
        },
      })

      map.addLayer({
        id: 'zone-lines',
        type: 'line',
        source: 'zones',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
        },
      })

      map.addLayer({
        id: 'zone-label-layer',
        type: 'symbol',
        source: 'zone-labels',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 13,
          'text-anchor': 'top-left',
          'text-offset': [0.2, 0.2],
        },
        paint: {
          'text-color': '#111111',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      })
    },

    addZoneHandleLayer() {
      if (!map) return

      map.addSource('zone-handles', {
        type: 'geojson',
        data: this.zoneHandlesToGeoJson() as any,
      })

      map.addLayer({
        id: 'zone-handles',
        type: 'circle',
        source: 'zone-handles',
        paint: {
          'circle-radius': 9,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#1976d2',
          'circle-stroke-width': 3,
        },
      })
    },

    addLineLayers() {
      if (!map) return

      map.addSource('visual-lines', {
        type: 'geojson',
        data: this.linesToGeoJson() as any,
      })

      map.addSource('line-points', {
        type: 'geojson',
        data: this.linePointsToGeoJson() as any,
      })

      map.addLayer({
        id: 'visual-line-layer',
        type: 'line',
        source: 'visual-lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 4,
          'line-dasharray': [1, 1.4],
        },
      })

      map.addLayer({
        id: 'line-point-handles',
        type: 'circle',
        source: 'line-points',
        paint: {
          'circle-radius': 8,
          'circle-color': '#ffffff',
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-width': 3,
        },
      })

      map.addLayer({
        id: 'line-point-labels',
        type: 'symbol',
        source: 'line-points',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#111111',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      })
    },

    addArrowLayers() {
      if (!map) return

      map.addSource('arrows', {
        type: 'geojson',
        data: this.arrowsToGeoJson() as any,
      })

      map.addLayer({
        id: 'arrow-lines',
        type: 'line',
        source: 'arrows',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 5,
        },
      })
    },

    addArrowHandleLayers() {
      if (!map) return

      map.addSource('arrow-handles', {
        type: 'geojson',
        data: this.arrowHandlesToGeoJson() as any,
      })

      map.addLayer({
        id: 'arrow-handles',
        type: 'circle',
        source: 'arrow-handles',
        paint: {
          'circle-radius': 9,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      })
    },

    addTextLayers() {
      if (!map) return

      map.addSource('map-text', {
        type: 'geojson',
        data: this.textToGeoJson() as any,
      })

      map.addLayer({
        id: 'map-text-layer',
        type: 'symbol',
        source: 'map-text',
        layout: {
          'text-field': ['get', 'text'],
          'text-size': ['get', 'fontSize'],
          'text-rotate': ['get', 'rotation'],
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      })
    },

    addTextHandleLayers() {
      if (!map) return

      map.addSource('text-handles', {
        type: 'geojson',
        data: this.textHandlesToGeoJson() as any,
      })

      map.addLayer({
        id: 'text-handles',
        type: 'circle',
        source: 'text-handles',
        paint: {
          'circle-radius': 9,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      })
    },

    onZoneClick(event: maplibregl.MapMouseEvent) {
      const zoneId = event.features?.[0]?.properties?.id
      const zone = this.findZone(zoneId)

      if (!zone) return
      if (this.isAddingHouse) return
      if (this.isAddingZone && zone.id !== this.selectedZoneId) return

      this.openZoneDetails(zone)
    },

    onLinePointClick(event: maplibregl.MapMouseEvent) {
      const lineId = event.features?.[0]?.properties?.lineId
      const line = this.findLine(lineId)

      if (!line) return

      event.preventDefault()
      this.openLineDetails(line)
    },

    // ---------------------------------------------------------------------------
    // Geometry helpers
    // ---------------------------------------------------------------------------

    makeZone(zone: Zone) {
      const points = this.getShapePoints(zone)

      return {
        ...zone,
        coordinates: [[...points, points[0]]],
      }
    },

    getShapePoints(zone: Zone) {
      const x = zone.centerLng
      const y = zone.centerLat
      let w = zone.width
      let h = zone.height
      const rotation = zone.rotation || 0

      if (zone.shape === 'square' || zone.shape === 'circle') {
        const size = Math.max(w, h)
        w = size
        h = size
      }

      if (zone.shape === 'square' || zone.shape === 'rectangle') {
        const points = [
          [-w / 2, h / 2],
          [w / 2, h / 2],
          [w / 2, -h / 2],
          [-w / 2, -h / 2],
        ]

        return points.map(([dx, dy]) => this.rotatePoint(x, y, dx, dy, rotation))
      }

      return this.getCirclePoints(x, y, w, h, 48, rotation)
    },

    rotatePoint(
      centerLng: number,
      centerLat: number,
      offsetLng: number,
      offsetLat: number,
      rotation: number,
    ) {
      const angle = (rotation * Math.PI) / 180

      const rotatedLng = offsetLng * Math.cos(angle) - offsetLat * Math.sin(angle)
      const rotatedLat = offsetLng * Math.sin(angle) + offsetLat * Math.cos(angle)

      return [centerLng + rotatedLng, centerLat + rotatedLat]
    },

    getLocalZonePointer(zone: Zone, event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) {
      const dx = event.lngLat.lng - zone.centerLng
      const dy = event.lngLat.lat - zone.centerLat

      // inverse rotation: converts pointer position back into the zone's local unrotated space
      const angle = -((zone.rotation || 0) * Math.PI) / 180

      return {
        x: dx * Math.cos(angle) - dy * Math.sin(angle),
        y: dx * Math.sin(angle) + dy * Math.cos(angle),
      }
    },

    getCirclePoints(x: number, y: number, w: number, h: number, count: number, rotation = 0) {
      const points: number[][] = []

      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (i / count) * Math.PI * 2
        const dx = Math.cos(angle) * (w / 2)
        const dy = Math.sin(angle) * (h / 2)

        points.push(this.rotatePoint(x, y, dx, dy, rotation))
      }

      return points
    },

    getArrowEndPoint(arrow: ArrowItem) {
      if (!map) return { lng: arrow.lng, lat: arrow.lat }

      const startPixel = map.project([arrow.lng, arrow.lat])
      const angle = (arrow.rotation * Math.PI) / 180

      const endPixel = {
        x: startPixel.x + Math.cos(angle) * arrow.length,
        y: startPixel.y + Math.sin(angle) * arrow.length,
      }

      const endLngLat = map.unproject(endPixel)

      return {
        lng: endLngLat.lng,
        lat: endLngLat.lat,
      }
    },

    getArrowRotatePoint(arrow: ArrowItem) {
      if (!map) return { lng: arrow.lng, lat: arrow.lat }

      const startPixel = map.project([arrow.lng, arrow.lat])
      const angle = ((arrow.rotation - 90) * Math.PI) / 180

      const rotatePixel = {
        x: startPixel.x + Math.cos(angle) * 55,
        y: startPixel.y + Math.sin(angle) * 55,
      }

      const rotateLngLat = map.unproject(rotatePixel)

      return {
        lng: rotateLngLat.lng,
        lat: rotateLngLat.lat,
      }
    },

    // ---------------------------------------------------------------------------
    // GeoJSON builders
    // ---------------------------------------------------------------------------

    zonesToGeoJson() {
      return {
        type: 'FeatureCollection',
        features: this.zones.map((zone) => ({
          type: 'Feature',
          properties: {
            id: zone.id,
            name: zone.name,
            color: zone.color,
          },
          geometry: {
            type: 'Polygon',
            coordinates: zone.coordinates,
          },
        })),
      }
    },

    zoneLabelsToGeoJson() {
      return {
        type: 'FeatureCollection',
        features: this.zones.map((zone) => {
          const bounds = this.getZoneBounds(zone)

          return {
            type: 'Feature',
            properties: {
              id: zone.id,
              name: zone.name,
            },
            geometry: {
              type: 'Point',
              coordinates: [bounds.minLng, bounds.maxLat],
            },
          }
        }),
      }
    },

    zoneHandlesToGeoJson() {
      const zone = this.findZone(this.selectedZoneId)

      if (!zone || zone.locked) {
        return {
          type: 'FeatureCollection',
          features: [],
        }
      }

      const points = this.getShapePoints(zone)
      const rotatePoint = this.getZoneRotatePoint(zone)

      return {
        type: 'FeatureCollection',
        features: [
          this.makeHandle('nw', points[0][0], points[0][1], '#ffffff'),
          this.makeHandle('ne', points[1][0], points[1][1], '#ffffff'),
          this.makeHandle('se', points[2][0], points[2][1], '#ffffff'),
          this.makeHandle('sw', points[3][0], points[3][1], '#ffffff'),
          this.makeHandle('rotate', rotatePoint.lng, rotatePoint.lat, '#9c27b0'),
        ],
      }
    },

    getZoneRotatePoint(zone: Zone) {
      const points = this.getShapePoints(zone)

      // For rectangle / square:
      // points[0] = top-left
      // points[1] = top-right
      // points[2] = bottom-right
      // points[3] = bottom-left
      const topRight = points[1]

      return {
        lng: topRight[0],
        lat: topRight[1],
      }
    },

    makeHandle(name: ResizeHandle, lng: number, lat: number, color = '#ffffff') {
      return {
        type: 'Feature',
        properties: {
          name,
          zoneId: this.selectedZoneId,
          color,
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      }
    },
    linesToGeoJson() {
      return {
        type: 'FeatureCollection',
        features: this.lines
          .filter((line) => line.points.length > 1)
          .map((line) => ({
            type: 'Feature',
            properties: {
              id: line.id,
              name: line.name,
              color: line.color,
            },
            geometry: {
              type: 'LineString',
              coordinates: line.points.map((point) => [point.lng, point.lat]),
            },
          })),
      }
    },

    linePointsToGeoJson() {
      return {
        type: 'FeatureCollection',
        features: this.lines.flatMap((line) =>
          line.points.map((point, index) => ({
            type: 'Feature',
            properties: {
              lineId: line.id,
              pointId: point.id,
              pointIndex: index,
              name: point.name,
              color: line.color,
            },
            geometry: {
              type: 'Point',
              coordinates: [point.lng, point.lat],
            },
          })),
        ),
      }
    },

    arrowsToGeoJson() {
      return {
        type: 'FeatureCollection',
        features: this.arrows.map((arrow) => {
          const end = this.getArrowEndPoint(arrow)

          return {
            type: 'Feature',
            properties: {
              id: arrow.id,
              name: arrow.name,
              color: arrow.color,
              rotation: arrow.rotation,
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [arrow.lng, arrow.lat],
                [end.lng, end.lat],
              ],
            },
          }
        }),
      }
    },

    arrowHandlesToGeoJson() {
      const arrow = this.findArrow(this.selectedArrowId)

      if (!arrow || arrow.locked) {
        return {
          type: 'FeatureCollection',
          features: [],
        }
      }

      const end = this.getArrowEndPoint(arrow)
      const rotate = this.getArrowRotatePoint(arrow)

      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              id: arrow.id,
              kind: 'move',
              color: '#1976d2',
            },
            geometry: {
              type: 'Point',
              coordinates: [arrow.lng, arrow.lat],
            },
          },
          {
            type: 'Feature',
            properties: {
              id: arrow.id,
              kind: 'resize',
              color: '#ff9800',
            },
            geometry: {
              type: 'Point',
              coordinates: [end.lng, end.lat],
            },
          },
          {
            type: 'Feature',
            properties: {
              id: arrow.id,
              kind: 'rotate',
              color: '#9c27b0',
            },
            geometry: {
              type: 'Point',
              coordinates: [rotate.lng, rotate.lat],
            },
          },
        ],
      }
    },

    textToGeoJson() {
      return {
        type: 'FeatureCollection',
        features: this.textItems.map((text) => ({
          type: 'Feature',
          properties: {
            id: text.id,
            name: text.name,
            text: text.text,
            color: text.color,
            fontSize: text.fontSize,
            rotation: text.rotation,
          },
          geometry: {
            type: 'Point',
            coordinates: [text.lng, text.lat],
          },
        })),
      }
    },

    textHandlesToGeoJson() {
      const text = this.findText(this.selectedTextId)

      if (!text || text.locked) {
        return {
          type: 'FeatureCollection',
          features: [],
        }
      }

      const rotate = this.getTextRotatePoint(text)

      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              id: text.id,
              kind: 'move',
              color: '#1976d2',
            },
            geometry: {
              type: 'Point',
              coordinates: [text.lng, text.lat],
            },
          },
          {
            type: 'Feature',
            properties: {
              id: text.id,
              kind: 'rotate',
              color: '#9c27b0',
            },
            geometry: {
              type: 'Point',
              coordinates: [rotate.lng, rotate.lat],
            },
          },
        ],
      }
    },

    getTextRotatePoint(text: TextItem) {
      if (!map) return { lng: text.lng, lat: text.lat }

      const centerPixel = map.project([text.lng, text.lat])
      const angle = ((text.rotation || 0) - 90) * (Math.PI / 180)

      const rotatePixel = {
        x: centerPixel.x + Math.cos(angle) * 45,
        y: centerPixel.y + Math.sin(angle) * 45,
      }

      const point = map.unproject(rotatePixel)

      return {
        lng: point.lng,
        lat: point.lat,
      }
    },

    getZoneBounds(zone: Zone) {
      const points = zone.coordinates[0]
      const lngs = points.map((point) => point[0])
      const lats = points.map((point) => point[1])

      return {
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
      }
    },

    // ---------------------------------------------------------------------------
    // Layer refresh helpers
    // ---------------------------------------------------------------------------

    refreshZones() {
      this.refreshZoneLayer()
      this.refreshZoneLabels()
      this.refreshZoneHandles()
    },

    refreshZoneLayer() {
      const source = map?.getSource('zones') as maplibregl.GeoJSONSource | undefined
      source?.setData(this.zonesToGeoJson() as any)
    },

    refreshZoneLabels() {
      const source = map?.getSource('zone-labels') as maplibregl.GeoJSONSource | undefined
      source?.setData(this.zoneLabelsToGeoJson() as any)
    },

    refreshZoneHandles() {
      const source = map?.getSource('zone-handles') as maplibregl.GeoJSONSource | undefined
      source?.setData(this.zoneHandlesToGeoJson() as any)
    },

    refreshLines() {
      const lineSource = map?.getSource('visual-lines') as maplibregl.GeoJSONSource | undefined
      const pointSource = map?.getSource('line-points') as maplibregl.GeoJSONSource | undefined

      lineSource?.setData(this.linesToGeoJson() as any)
      pointSource?.setData(this.linePointsToGeoJson() as any)
    },

    refreshArrows() {
      const source = map?.getSource('arrows') as maplibregl.GeoJSONSource | undefined
      const handleSource = map?.getSource('arrow-handles') as maplibregl.GeoJSONSource | undefined

      source?.setData(this.arrowsToGeoJson() as any)
      handleSource?.setData(this.arrowHandlesToGeoJson() as any)
    },

    refreshText() {
      const source = map?.getSource('map-text') as maplibregl.GeoJSONSource | undefined
      const handleSource = map?.getSource('text-handles') as maplibregl.GeoJSONSource | undefined

      source?.setData(this.textToGeoJson() as any)
      handleSource?.setData(this.textHandlesToGeoJson() as any)
    },

    // ---------------------------------------------------------------------------
    // Find helpers
    // ---------------------------------------------------------------------------

    findHouse(id: string) {
      return this.houses.find((house) => house.id === id)
    },

    findZone(id: string) {
      return this.zones.find((zone) => zone.id === id)
    },

    findArrow(id: string) {
      return this.arrows.find((arrow) => arrow.id === id)
    },

    findText(id: string) {
      return this.textItems.find((text) => text.id === id)
    },

    findLine(id: string) {
      return this.lines.find((line) => line.id === id)
    },

    // ---------------------------------------------------------------------------
    // Display helpers
    // ---------------------------------------------------------------------------

    getHouseIcon(icon: HouseIcon) {
      const icons = {
        Home: mdiHome,
        HomeAlertOutline: mdiHomeAlertOutline,
        HomeAccount: mdiHomeAccount,
        HomeAnalytics: mdiHomeAnalytics,
        HomeAutomation: mdiHomeAutomation,
        HomeClockOutline: mdiHomeClockOutline,
        HomeFlood: mdiHomeFlood,
        HomeOff: mdiHomeOff,
        HomeLightningBoltOutline: mdiHomeLightningBoltOutline,
        HomeLock: mdiHomeLock,
        HomeLockOpen: mdiHomeLockOpen,
      }

      return icons[icon] || mdiHome
    },

    getHouseColor(status: HouseStatus) {
      if (status === 'new') return '#1976d2' // blue
      if (status === 'visited') return '#2e7d32' // green
      if (status === 'not_home') return '#f9a825' // yellow
      if (status === 'follow_up') return '#fb8c00' // orange
      if (status === 'interested') return '#6a1b9a' // purple
      if (status === 'bible_study') return '#00897b' // teal
      if (status === 'saved') return '#00acc1' // cyan
      if (status === 'member') return '#43a047' // bright green
      if (status === 'home_church') return '#5e35b1' // deep purple
      if (status === 'do_not_return') return '#c62828' // red
      if (status === 'danger') return '#000000' // black
      if (status === 'moved') return '#757575' // gray
      if (status === 'inactive') return '#546e7a' // blue gray

      return '#1976d2'
    },

    // ---------------------------------------------------------------------------
    // Dexie local database helpers
    // ---------------------------------------------------------------------------

    async loadMapData() {
      const houses = await evangridMapDb.houses.toArray()
      const zones = await evangridMapDb.zones.toArray()
      const arrows = await evangridMapDb.arrows.toArray()
      const texts = await evangridMapDb.texts.toArray()
      const lines = await evangridMapDb.lines.toArray()

      this.houses = houses.map((house) => ({
        ...house,
        marker: undefined,
      })) as House[]

      this.zones = zones.map((zone) => this.makeZone(zone as Zone)) as Zone[]

      this.arrows = arrows as ArrowItem[]
      this.textItems = texts as TextItem[]
      this.lines = lines as ContinuousLine[]
    },

    cleanHouseForDb(house: House) {
      return {
        id: house.id,
        name: house.name,
        address: house.address,
        lng: house.lng,
        lat: house.lat,
        status: house.status,
        language: house.language,
        notes: house.notes,
        icon: house.icon,
        locked: house.locked,
      }
    },

    async saveHouseToDb(house: House) {
      await evangridMapDb.houses.put(this.cleanHouseForDb(house))
    },

    async saveZoneToDb(zone: Zone) {
      await evangridMapDb.zones.put(JSON.parse(JSON.stringify(zone)))
    },

    async saveArrowToDb(arrow: ArrowItem) {
      await evangridMapDb.arrows.put(JSON.parse(JSON.stringify(arrow)))
    },

    async saveTextToDb(text: TextItem) {
      await evangridMapDb.texts.put(JSON.parse(JSON.stringify(text)))
    },

    async saveLineToDb(line: ContinuousLine) {
      await evangridMapDb.lines.put(JSON.parse(JSON.stringify(line)))
    },

    async deleteHouseFromDb(id: string) {
      await evangridMapDb.houses.delete(id)
    },

    async deleteZoneFromDb(id: string) {
      await evangridMapDb.zones.delete(id)
    },

    async deleteArrowFromDb(id: string) {
      await evangridMapDb.arrows.delete(id)
    },

    async deleteTextFromDb(id: string) {
      await evangridMapDb.texts.delete(id)
    },

    async deleteLineFromDb(id: string) {
      await evangridMapDb.lines.delete(id)
    },
  },

  // Component lifecycle: load data first, then initialize MapLibre.
  async mounted() {
    this.setupOfflineTileProtocol()

    await this.loadMapData()

    this.initMap()
  },

  watch: {
    // MapLibre removes custom layers when the style changes.
    // Re-add all custom layers/sources after the new style loads.
    'systemSt.mapMode'() {
      if (!map) return

      map.setStyle(this.systemSt.getMapStyle() as any)

      map.once('styledata', () => {
        this.addZoneLayers()
        this.addZoneHandleLayer()
        this.addLineLayers()
        this.addArrowLayers()
        this.addArrowHandleLayers()
        this.addTextLayers()
        this.addTextHandleLayers()

        this.refreshZones()
        this.refreshLines()
        this.refreshArrows()
        this.refreshText()
        this.drawHouseMarkers()
      })
    },
  },

  // Cleanup: remove DOM markers and destroy the MapLibre instance.
  beforeUnmount() {
    this.houses.forEach((house) => house.marker?.remove())

    if (map) {
      map.remove()
      map = null
    }
  },
}
</script>

<template>
  <!--
    Main map shell:
    - The map fills the screen.
    - Bottom navigation switches between add tools.
    - Dialogs edit and save each selected object.
  -->
  <v-card class="position-relative w-100 h-screen">
    <div id="map" class="w-100 h-100"></div>

    <!-- Bottom tool bar. Shows add buttons when no tool is active. -->
    <v-bottom-navigation class="bg-primary mb-13">
      <v-card class="ga-1 rounded-0 bg-primary" elevation="0">
        <template v-if="mode === 'none'">
          <v-btn
            stacked
            size="x-small"
            color="transparent"
            class="text-grey"
            elevation="0"
            @click="openAddHouseMode"
          >
            <v-icon start icon="$Home" />
            + Home
          </v-btn>

          <v-btn
            stacked
            size="x-small"
            color="transparent"
            class="text-grey"
            elevation="0"
            @click="openAddZoneMode"
          >
            <v-icon start icon="$CropSquare" />
            + Zone
          </v-btn>

          <v-btn
            stacked
            size="x-small"
            color="transparent"
            class="text-grey"
            elevation="0"
            @click="openAddArrowMode"
          >
            <v-icon start icon="$ArrowRightThin" />
            + Line
          </v-btn>

          <v-btn
            stacked
            size="x-small"
            color="transparent"
            class="text-grey"
            elevation="0"
            @click="openAddTextMode"
          >
            <v-icon start icon="$FormatText" />
            + Text
          </v-btn>

          <v-btn
            stacked
            size="x-small"
            color="transparent"
            class="text-grey"
            elevation="0"
            @click="openAddLineMode"
          >
            <v-icon start icon="$VectorSquarePlus" />
            + Dots
          </v-btn>
        </template>

        <v-btn
          v-if="isAddingHouse"
          stacked
          size="x-small"
          color="transparent"
          class="text-blue"
          elevation="0"
          @click="openSelectedHouseDetails"
        >
          Open House Controls
        </v-btn>

        <v-btn
          v-if="isAddingZone"
          stacked
          size="x-small"
          color="transparent"
          class="text-blue"
          elevation="0"
          @click="openSelectedZoneDetails"
        >
          Open Zone Controls
        </v-btn>

        <v-btn
          v-if="isAddingArrow"
          stacked
          size="x-small"
          color="transparent"
          class="text-blue"
          elevation="0"
          @click="openSelectedArrowDetails"
        >
          Open Straight Line Controls
        </v-btn>

        <v-btn
          v-if="isAddingText"
          stacked
          size="x-small"
          color="transparent"
          class="text-blue"
          elevation="0"
          @click="openSelectedTextDetails"
        >
          Open Text Controls
        </v-btn>

        <v-btn
          v-if="isAddingLine"
          stacked
          size="x-small"
          color="transparent"
          class="text-blue"
          elevation="0"
          @click="openSelectedLineDetails"
        >
          Finish / Open Chained Dot Controls
        </v-btn>
      </v-card>
    </v-bottom-navigation>

    <!-- Context hint shown only while an add/edit mode is active. -->
    <v-alert
      v-if="hintText"
      class="position-absolute left-0 right-0 top-0 ma-3"
      type="info"
      variant="tonal"
      density="compact"
      rounded="lg"
    >
      <p style="font-size: 12px !important">{{ hintText }}</p>
    </v-alert>

    <!--
      ARROW DIALOG
      Used for straight-line name, color, notes, save, edit-on-map, and delete.
    -->
    <v-dialog
      v-model="arrowDialog"
      max-width="520"
      fullscreen
      transition="dialog-bottom-transition"
    >
      <v-card v-if="editingArrow">
        <v-card-text class="pa-0">
          <!-- Header -->
          <div class="bg-primary pa-1 rounded-b-xl">
            <v-card class="bg-transparent" elevation="0">
              <v-btn size="x-large" icon color="transparent" @click="closeDialogOnly">
                <v-icon start icon="$ArrowLeftThin" />
              </v-btn>
              <p class="text-subtitle-2 mx-2 my-0 font-weight-black">STRAIGHT LINE DETAILS</p>
            </v-card>
            <v-card class="px-2 mx-0 mb-4 bg-transparent" elevation="0">
              <p v-if="editingArrow" style="font-size: 12px !important">
                Info: Add a straight line for direction, planning, or simple map marking.
              </p>
              <p v-if="!editingArrow" style="font-size: 12px !important">
                Hint: Save locks the straight line and updates your data. Edit on map lets you move,
                resize, or rotate it again. Delete removes it.
              </p>
            </v-card>
          </div>

          <div class="pa-4">
            <v-text-field
              v-model="editingArrow.name"
              label="Name"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="editingArrow.color"
              label="Color"
              type="color"
              variant="outlined"
              density="compact"
            />
            <v-textarea
              v-model="editingArrow.notes"
              label="Notes"
              variant="outlined"
              density="compact"
              rows="4"
            />
          </div>
        </v-card-text>

        <v-card-actions>
          <v-card width="100%" elevation="0">
            <v-btn class="my-2" color="grey" variant="outlined" block @click="editArrowPosition"
              >Edit On Map</v-btn
            >
            <v-btn class="my-2" color="green" variant="flat" block @click="saveArrow">Save</v-btn>
            <v-btn class="mb-2 mt-6" color="error" variant="tonal" block @click="deleteArrow"
              >Delete</v-btn
            >
          </v-card>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!--
      TEXT DIALOG
      Used for map labels. The purple handle rotates the text on the map.
    -->
    <v-dialog v-model="textDialog" max-width="520" fullscreen transition="dialog-bottom-transition">
      <v-card v-if="editingText">
        <v-card-text class="pa-0">
          <!-- Header -->
          <div class="bg-primary pa-1 rounded-b-xl">
            <v-card class="bg-transparent" elevation="0">
              <v-btn size="x-large" icon color="transparent" @click="closeDialogOnly">
                <v-icon start icon="$ArrowLeftThin" />
              </v-btn>
              <p class="text-subtitle-2 mx-2 my-0 font-weight-black">TEXT DETAILS</p>
            </v-card>
            <v-card class="px-2 mx-0 mb-4 bg-transparent" elevation="0">
              <p v-if="editingText" style="font-size: 12px !important">
                Info: Adding text on map for additional notes or other map notes.
              </p>
              <p v-if="!editingText" style="font-size: 12px !important">
                Hint: Save locks the text and updates your data. Edit points lets you move it again
                or edit details. Delete removes it.
              </p>
            </v-card>
          </div>

          <div class="pa-4">
            <v-text-field
              v-model="editingText.name"
              label="Name"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="editingText.text"
              label="Text"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="editingText.color"
              label="Color"
              type="color"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model.number="editingText.rotation"
              label="Rotation"
              variant="outlined"
              density="compact"
              type="number"
            />
            <v-textarea
              v-model="editingText.notes"
              label="Notes"
              variant="outlined"
              density="compact"
              rows="4"
            />
          </div>
        </v-card-text>

        <v-card-actions>
          <v-card width="100%" elevation="0">
            <v-btn class="my-2" color="grey" variant="outlined" block @click="editTextPosition"
              >Edit On Map</v-btn
            >
            <v-btn class="my-2" color="green" variant="flat" block @click="saveText">Save</v-btn>
            <v-btn class="mb-2 mt-6" color="error" variant="tonal" block @click="deleteText"
              >Delete</v-btn
            >
          </v-card>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!--
      CHAINED-DOT LINE DIALOG
      Used for route/path lines made from multiple movable points.
    -->
    <v-dialog v-model="lineDialog" max-width="520" fullscreen transition="dialog-bottom-transition">
      <v-card v-if="editingLine">
        <v-card-text class="pa-0">
          <!-- Header -->
          <div class="bg-primary pa-1 rounded-b-xl">
            <v-card class="bg-transparent" elevation="0">
              <v-btn size="x-large" icon color="transparent" @click="closeDialogOnly">
                <v-icon start icon="$ArrowLeftThin" />
              </v-btn>
              <p class="text-subtitle-2 mx-2 my-0 font-weight-black">CHAINED DOT LINE DETAILS</p>
            </v-card>
            <v-card class="px-2 mx-0 mb-4 bg-transparent" elevation="0">
              <p v-if="editingLine" style="font-size: 12px !important">
                Info: Add connected dots to make a route, path, boundary, or planned movement line.
              </p>
              <p v-if="!editingLine" style="font-size: 12px !important">
                Hint: Save locks the chained dot line and updates your data. Edit points lets you
                move the dots again. Delete removes it.
              </p>
            </v-card>
          </div>

          <div class="pa-4">
            <v-text-field
              v-model="editingLine.name"
              label="Chained Dot Line Name"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="editingLine.color"
              label="Chained Dot Line Color"
              type="color"
              variant="outlined"
              density="compact"
            />
            <v-textarea
              v-model="editingLine.notes"
              label="Notes"
              variant="outlined"
              density="compact"
              rows="3"
            />

            <p class="text-caption font-weight-bold mt-4 mb-2">Connected Dots</p>

            <v-card
              v-for="(point, index) in editingLine.points"
              :key="point.id"
              class="mb-2"
              elevation="0"
            >
              <div class="d-flex align-center ga-2">
                <v-text-field
                  v-model="point.name"
                  :label="`Point ${index + 1} Name`"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="mt-2"
                />

                <v-btn
                  icon
                  color="error"
                  variant="tonal"
                  size="x-small"
                  @click="editingLine.points.splice(index, 1)"
                >
                  <v-icon icon="$Close" />
                </v-btn>
              </div>
            </v-card>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-card width="100%" elevation="0">
            <v-btn class="my-2" color="grey" variant="outlined" block @click="editLinePosition"
              >Edit Dots On Map</v-btn
            >
            <v-btn class="my-2" color="green" variant="flat" block @click="saveLine">Save</v-btn>
            <v-btn class="mb-2 mt-6" color="error" variant="tonal" block @click="deleteLine"
              >Delete</v-btn
            >
          </v-card>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!--
      HOUSE DIALOG
      Used for marker name, address, icon, status, language, and notes.
    -->
    <v-dialog
      v-model="houseDialog"
      max-width="520"
      fullscreen
      transition="dialog-bottom-transition"
    >
      <v-card v-if="editingHouse">
        <v-card-text class="pa-0">
          <!-- Header -->
          <div class="bg-primary pa-1 rounded-b-xl">
            <v-card class="bg-transparent" elevation="0">
              <v-btn size="x-large" icon color="transparent" @click="closeDialogOnly">
                <v-icon start icon="$ArrowLeftThin" />
              </v-btn>
              <p class="text-subtitle-2 mx-2 my-0 font-weight-black">HOUSE DETAILS</p>
            </v-card>
            <v-card class="px-2 mx-0 mb-4 bg-transparent" elevation="0">
              <p v-if="isAddingHouse" style="font-size: 12px !important">
                Info: Adding a house is a place you are or plan to visit. A place you have meetings,
                service, or church. These locations can have people tied to them.
              </p>
              <p v-if="!isAddingHouse" style="font-size: 12px !important">
                Hint: Save locks the house and updates your data. Edit Position lets you move it
                again or edit details. Delete removes it.
              </p>
            </v-card>
          </div>

          <div class="pa-4">
            <v-text-field
              v-model="editingHouse.name"
              label="Name"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="editingHouse.address"
              label="Address"
              variant="outlined"
              density="compact"
            />

            <v-select
              v-model="editingHouse.icon"
              label="Icon"
              variant="outlined"
              density="compact"
              :items="houseIconItems"
              item-title="title"
              item-value="value"
            >
              <!-- Dropdown items -->
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <v-icon :icon="'$' + item" />
                  </template>
                </v-list-item>
              </template>

              <!-- Selected item -->
              <template #selection="{ item }">
                <div class="d-flex align-center ga-2">
                  <v-icon :icon="'$' + item" />
                  <span>{{ item }}</span>
                </div>
              </template>
            </v-select>

            <v-select
              v-model="editingHouse.status"
              label="Status"
              variant="outlined"
              density="compact"
              :items="[
                'new',
                'visited',
                'not_home',
                'follow_up',
                'interested',
                'bible_study',
                'saved',
                'member',
                'home_church',
                'do_not_return',
                'danger',
                'moved',
                'inactive',
              ]"
            />

            <v-text-field
              v-model="editingHouse.language"
              label="Language"
              variant="outlined"
              density="compact"
            />
            <v-textarea
              v-model="editingHouse.notes"
              label="Notes"
              variant="outlined"
              density="compact"
              rows="4"
            />
          </div>
        </v-card-text>

        <v-card-actions>
          <v-card width="100%" elevation="0">
            <v-btn class="my-2" color="grey" variant="outlined" block @click="editHousePosition"
              >Edit Position/ Details</v-btn
            >
            <v-btn class="my-2" color="green" variant="flat" block @click="saveHouse">Save</v-btn>
            <v-btn class="mb-2 mt-6" color="error" variant="tonal" block @click="deleteHouse"
              >Delete</v-btn
            >
          </v-card>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!--
      ZONE DIALOG
      Used for zone shape, size, color, rotation, and notes.
    -->
    <v-dialog v-model="zoneDialog" max-width="520" fullscreen transition="dialog-bottom-transition">
      <v-card v-if="editingZone">
        <v-card-text class="pa-0">
          <!-- Header -->
          <div class="bg-primary pa-1 rounded-b-xl">
            <v-card class="bg-transparent" elevation="0">
              <v-btn size="x-large" icon color="transparent" @click="closeDialogOnly">
                <v-icon start icon="$ArrowLeftThin" />
              </v-btn>
              <p class="text-subtitle-2 mx-2 my-0 font-weight-black">ZONE DETAILS</p>
            </v-card>
            <v-card class="px-2 mx-0 mb-4 bg-transparent" elevation="0">
              <p v-if="isAddingHouse" style="font-size: 12px !important">
                Info: Adding a Zone is a section of a map you can work, assign to group, completed,
                keep clear of, or any idea for zoning you see.
              </p>
              <p v-if="!isAddingHouse" style="font-size: 12px !important">
                Hint: Save locks the zone and updates your data. Edit Position lets you move it
                again or edit details. Delete removes it.
              </p>
            </v-card>
          </div>

          <div class="pa-4">
            <v-text-field
              v-model="editingZone.name"
              label="Zone Name"
              variant="outlined"
              density="compact"
            />

            <v-select
              v-model="editingZone.shape"
              label="Zone Shape"
              variant="outlined"
              density="compact"
              :items="zoneShapeItems"
              @update:model-value="onZoneShapeChange"
            />

            <v-text-field
              v-model="editingZone.color"
              label="Zone Color"
              variant="outlined"
              density="compact"
              type="color"
            />

            <v-text-field
              v-model.number="editingZone.width"
              label="Width"
              variant="outlined"
              density="compact"
              type="number"
              @update:model-value="onZoneShapeChange"
            />

            <v-text-field
              v-model.number="editingZone.height"
              label="Height"
              variant="outlined"
              density="compact"
              type="number"
              @update:model-value="onZoneShapeChange"
            />

            <v-text-field
              v-model.number="editingZone.rotation"
              label="Rotation"
              variant="outlined"
              density="compact"
              type="number"
              @update:model-value="onZoneShapeChange"
            />

            <v-textarea
              v-model="editingZone.notes"
              label="Notes"
              variant="outlined"
              density="compact"
              rows="4"
            />
          </div>
        </v-card-text>

        <v-card-actions>
          <v-card width="100%" elevation="0">
            <v-btn class="my-2" color="grey" variant="outlined" block @click="editZonePosition"
              >Edit Position/ Details</v-btn
            >
            <v-btn class="my-2" color="green" variant="flat" block @click="saveZone">Save</v-btn>

            <v-btn class="mb-2 mt-6" color="error" variant="tonal" block @click="deleteZone"
              >Delete</v-btn
            >
          </v-card>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>
