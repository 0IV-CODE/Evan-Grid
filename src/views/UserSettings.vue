<script lang="ts">
import { defineAsyncComponent } from 'vue'

type SettingKey = 'mapMode' | 'mapAreas' | 'privacy' | 'data'

export default {
  name: 'UserSettings',

  components: {
    MapSettings: defineAsyncComponent(() => import('../components/main/MapSettings.vue')),
    MapAreas: defineAsyncComponent(() => import('../components/main/MapAreas.vue')),
    PrivacySettings: defineAsyncComponent(() => import('../components/main/PrivacySettings.vue')),
    DataSettings: defineAsyncComponent(() => import('../components/main/DataSettings.vue')),
    PrefSettings: defineAsyncComponent(() => import('../components/main/PrefSettings.vue')),
  },

  data: () => ({
    selectedSetting: null as SettingKey | null,

    accountItems: [
      {
        key: 'mapMode',
        title: 'Map mode',
        subtitle: 'Online / Offline map tiles, Map Source',
        icon: '$CloudOffOutline',
      },
      {
        key: 'mapAreas',
        title: 'Download map area',
        subtitle: 'Save map tiles for offline use',
        icon: '$MapSearchOutline',
      },
      {
        key: 'privacy',
        title: 'Privacy Settings',
        subtitle: 'Auto Delete, Incognito App, Fail Safe',
        icon: '$Incognito',
      },
      {
        key: 'data',
        title: 'Data',
        subtitle: 'Export data',
        icon: '$DatabaseOutline',
      },
      {
        key: 'preferences',
        title: 'Preferences',
        subtitle: 'Dark Mode, Light Mode, Font Size',
        icon: '$InformationBoxOutline',
      },
    ] as {
      key: SettingKey
      title: string
      subtitle: string
      icon: string
    }[],
  }),

  computed: {
    selectedComponent() {
      if (this.selectedSetting === 'mapMode') return 'MapSettings'
      if (this.selectedSetting === 'mapAreas') return 'MapAreas'
      if (this.selectedSetting === 'privacy') return 'PrivacySettings'
      if (this.selectedSetting === 'data') return 'DataSettings'
      if (this.selectedSetting === 'preferences') return 'PrefSettings'

      return null
    },
  },

  methods: {
    openSetting(item: { key: SettingKey }) {
      this.selectedSetting = item.key
    },

    backToSettings() {
      this.selectedSetting = null
    },
  },
}
</script>

<template>
  <v-card class="pa-0 mx-auto bg-transparent" rounded="0" elevation="0">
    <!-- Main settings list -->
    <v-card v-if="!selectedSetting" class="pa-4 bg-transparent" flat rounded="0">
      <p class="text-subtitle-1 font-weight-medium mb-3">Account</p>

      <v-btn
        v-for="item in accountItems"
        :key="item.key"
        class="settings-btn mb-3 text-none"
        block
        height="76"
        rounded="lg"
        variant="flat"
        @click="openSetting(item)"
      >
        <div class="d-flex align-center w-100">
          <v-icon :icon="item.icon" color="grey-darken-1" size="22" />

          <div class="flex-grow-1 text-left px-4">
            <p class="text-body-2 font-weight-bold ma-0">
              {{ item.title }}
            </p>

            <p class="text-caption text-grey-darken-1 ma-0">
              {{ item.subtitle }}
            </p>
          </div>

          <v-icon icon="$ChevronRight" color="grey-darken-1" size="20" />
        </div>
      </v-btn>
    </v-card>

    <!-- Selected lazy-loaded setting component -->
    <v-card v-else flat rounded="0">
      <v-card class="pa-3 d-flex align-center ga-2" flat rounded="0">
        <v-btn icon="$ChevronLeft" variant="text" @click="backToSettings" />

        <p class="text-subtitle-1 font-weight-medium ma-0">Settings</p>
      </v-card>

      <Suspense>
        <component :is="selectedComponent" />

        <template #fallback>
          <v-card class="pa-4" flat>
            <p class="text-body-2 text-grey-darken-1 ma-0">Loading...</p>
          </v-card>
        </template>
      </Suspense>
    </v-card>
  </v-card>
</template>

<style scoped>
.settings-btn {
  justify-content: flex-start;
  border: 1px solid rgba(0, 0, 0, 0.05);
}
</style>
