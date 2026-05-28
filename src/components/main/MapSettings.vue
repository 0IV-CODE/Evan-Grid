<script lang="ts">
import { systemSt } from '@/stores/systemSt.js'

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

type MapTileGroup = 'opsec' | 'reliable'

type OnlineTileOption = {
  title: string
  value: MapTileStyle
  desc: string
  hostedBy: string
  origin: string
  open: boolean
  privacyScore: number
  group: MapTileGroup
}

export default {
  name: 'MapSettings',

  data: () => ({
    systemSt: systemSt(),

    onlineTileOptions: [
      {
        title: 'Stadia Dark',
        value: 'stadia_dark',
        desc: 'Dark map. Better for overlays and field use.',
        hostedBy: 'Stadia Maps',
        origin: 'US / EU endpoints',
        open: false,
        privacyScore: 2,
        group: 'opsec',
      },
      {
        title: 'Stadia Smooth',
        value: 'stadia_smooth',
        desc: 'Clean minimal map. Good for houses and zones.',
        hostedBy: 'Stadia Maps',
        origin: 'US / EU endpoints',
        open: false,
        privacyScore: 2,
        group: 'opsec',
      },
      {
        title: 'Carto Dark',
        value: 'carto_dark',
        desc: 'Minimal dark map with low visual noise.',
        hostedBy: 'CARTO',
        origin: 'Spain / EU',
        open: false,
        privacyScore: 3,
        group: 'opsec',
      },
      {
        title: 'Carto Light',
        value: 'carto_light',
        desc: 'Clean light map with simple styling.',
        hostedBy: 'CARTO',
        origin: 'Spain / EU',
        open: false,
        privacyScore: 3,
        group: 'opsec',
      },

      {
        title: 'Esri Satellite',
        value: 'satellite',
        desc: 'Reliable satellite imagery.',
        hostedBy: 'Esri ArcGIS',
        origin: 'United States',
        open: false,
        privacyScore: 3,
        group: 'reliable',
      },
      {
        title: 'OpenStreetMap Standard',
        value: 'osm_standard',
        desc: 'Default public community map.',
        hostedBy: 'OpenStreetMap public servers',
        origin: 'Global/community infrastructure',
        open: false,
        privacyScore: 4,
        group: 'reliable',
      },
      {
        title: 'Humanitarian OSM',
        value: 'hot',
        desc: 'High visibility roads and buildings.',
        hostedBy: 'HOT / OSM France',
        origin: 'France / EU',
        open: false,
        privacyScore: 4,
        group: 'reliable',
      },
      {
        title: 'CyclOSM',
        value: 'cyclosm',
        desc: 'Detailed paths and roads.',
        hostedBy: 'CyclOSM public servers',
        origin: 'France / EU',
        open: false,
        privacyScore: 4,
        group: 'reliable',
      },
      {
        title: 'OpenTopoMap',
        value: 'topo',
        desc: 'Terrain and elevation map.',
        hostedBy: 'OpenTopoMap',
        origin: 'Germany / EU',
        open: false,
        privacyScore: 4,
        group: 'reliable',
      },
    ] as OnlineTileOption[],
  }),

  computed: {
    isOfflineMode: {
      get(): boolean {
        return this.systemSt.mapMode === 'offline'
      },

      set(value: boolean) {
        this.systemSt.mapMode = value ? 'offline' : 'online'
      },
    },

    mapModeDesc(): string {
      if (this.systemSt.mapMode === 'offline') {
        return 'Offline mode blocks map tile requests and uses saved map areas only.'
      }

      return 'Online mode downloads live map tiles and may expose viewed map areas.'
    },

    opsecTileOptions(): OnlineTileOption[] {
      return this.onlineTileOptions.filter((item) => item.group === 'opsec')
    },

    reliableTileOptions(): OnlineTileOption[] {
      return this.onlineTileOptions.filter((item) => item.group === 'reliable')
    },
  },

  methods: {
    safetyLabel(score: number) {
      if (score <= 1) return 'Best'
      if (score <= 2) return 'Good'
      if (score <= 3) return 'Medium'
      return 'Higher Exposure'
    },
  },
}
</script>

<template>
  <v-card class="pa-0 mx-auto rounded-t-xl bg-primary" max-width="520" rounded="0" elevation="0">
    <v-card class="pa-4 border-b-sm bg-primary" flat rounded="0">
      <p class="text-subtitle-1 font-weight-bold ma-0">Map Mode</p>

      <p class="text-body-2 text-grey-darken-1 mt-n1 mb-0">
        Control how map tiles are loaded in the app.
      </p>
    </v-card>

    <v-card class="pa-4 bg-primary" flat>
      <v-switch v-model="isOfflineMode" color="blue" inset hide-details>
        <template #label>
          <div>
            <p class="text-body-2 font-weight-medium ma-0">
              {{ systemSt.mapMode === 'offline' ? 'Offline Mode' : 'Online Mode' }}
            </p>

            <p class="text-grey-darken-1" style="font-size: 12px">
              {{ mapModeDesc }}
            </p>
          </div>
        </template>
      </v-switch>
    </v-card>

    <p class="text-body-2 font-weight-bold ml-5 mb-0">Map Style</p>

    <p class="text-grey-darken-1 ml-5 mb-2" style="font-size: 12px">
      Better OPSEC exposes less request data. Reliable options may be stronger servers but less
      private. Lower Score is safer, but not bullet proof (Data Checked 05/16/26)
    </p>

    <v-card
      v-if="systemSt.mapMode === 'online'"
      class="pa-2 mx-2 rounded-0 bg-primary"
      flat
      height="350"
      style="overflow-y: auto; border-top: 2px white solid; border-bottom: 2px white solid"
    >
      <p class="font-weight-bold ml-1 mb-2" style="font-size: 12px">Better OPSEC</p>

      <v-card
        v-for="item in opsecTileOptions"
        :key="item.value"
        class="mb-2"
        rounded="lg"
        flat
        border
        @click="item.open = !item.open"
      >
        <v-card-text class="d-flex align-start justify-space-between">
          <div class="pr-2">
            <p class="text-caption font-weight-medium ma-0">
              {{ item.title }}
            </p>

            <p class="text-grey-darken-1 ma-0" style="font-size: 12px">
              {{ item.desc }}
            </p>

            <p class="ma-0 font-weight-medium" style="font-size: 11px">
              Safety: {{ safetyLabel(item.privacyScore) }}
            </p>

            <div v-if="item.open" class="mt-2">
              <p class="text-grey-darken-1 ma-0" style="font-size: 11px">
                Server: {{ item.hostedBy }}
              </p>

              <p class="text-grey-darken-1 ma-0" style="font-size: 11px">
                Origin: {{ item.origin }}
              </p>

              <p class="text-grey-darken-1 ma-0" style="font-size: 11px">
                Privacy Score: {{ item.privacyScore }}/5
              </p>
            </div>
          </div>

          <div class="d-flex align-center ga-2">
            <v-icon size="small" color="grey" :icon="item.open ? '$ChevronUp' : '$ChevronDown'" />

            <v-icon
              :color="systemSt.mapTileStyle === item.value ? 'blue' : 'grey'"
              size="large"
              :icon="
                systemSt.mapTileStyle === item.value
                  ? '$CheckboxMarkedOutline'
                  : '$CheckboxBlankOutline'
              "
              @click.stop="systemSt.mapTileStyle = item.value"
            />
          </div>
        </v-card-text>
      </v-card>

      <p class="font-weight-bold ml-1 mt-2 mb-2" style="font-size: 12px">Reliable / Less Private</p>

      <v-card
        v-for="item in reliableTileOptions"
        :key="item.value"
        class="mb-2"
        rounded="lg"
        flat
        border
        @click="item.open = !item.open"
      >
        <v-card-text class="d-flex align-start justify-space-between">
          <div class="pr-2">
            <p class="text-caption font-weight-medium ma-0">
              {{ item.title }}
            </p>

            <p class="text-grey-darken-1 ma-0" style="font-size: 12px">
              {{ item.desc }}
            </p>

            <p class="ma-0 font-weight-medium" style="font-size: 11px">
              Safety: {{ safetyLabel(item.privacyScore) }}
            </p>

            <div v-if="item.open" class="mt-2">
              <p class="text-grey-darken-1 ma-0" style="font-size: 11px">
                Server: {{ item.hostedBy }}
              </p>

              <p class="text-grey-darken-1 ma-0" style="font-size: 11px">
                Origin: {{ item.origin }}
              </p>

              <p class="text-grey-darken-1 ma-0" style="font-size: 11px">
                Privacy Score: {{ item.privacyScore }}/5
              </p>
            </div>
          </div>

          <div class="d-flex align-center ga-2">
            <v-icon size="small" color="grey" :icon="item.open ? '$ChevronUp' : '$ChevronDown'" />

            <v-icon
              :color="systemSt.mapTileStyle === item.value ? 'blue' : 'grey'"
              size="large"
              :icon="
                systemSt.mapTileStyle === item.value
                  ? '$CheckboxMarkedOutline'
                  : '$CheckboxBlankOutline'
              "
              @click.stop="systemSt.mapTileStyle = item.value"
            />
          </div>
        </v-card-text>
      </v-card>
    </v-card>
  </v-card>
</template>

<style scoped></style>
