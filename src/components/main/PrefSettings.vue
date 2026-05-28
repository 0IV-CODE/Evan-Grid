<script lang="ts">
import { systemSt } from '@/stores/systemSt.js'

type ThemeMode = 'light' | 'dark'

export default {
  name: 'PrefSettings',

  data: () => ({
    systemSt: systemSt(),
  }),

  computed: {
    themeMode: {
      get(): ThemeMode {
        return this.$vuetify.theme.global.name.value as ThemeMode
      },

      set(value: ThemeMode) {
        this.$vuetify.theme.change(value)
      },
    },

    isDark(): boolean {
      return this.themeMode === 'dark'
    },
  },
}
</script>

<template>
  <v-card class="pa-0 mx-auto bg-primary rounded-t-xl" max-width="520" rounded="0" elevation="0">
    <!-- header -->
    <v-card class="pa-4 border-b-sm bg-primary" flat rounded="0">
      <p class="text-subtitle-1 font-weight-bold ma-0">Preferences</p>

      <p class="text-body-2 text-grey-darken-1 mt-1 mb-0">Controls app preferences</p>
    </v-card>

    <!-- appearance -->
    <v-card class="pa-4 bg-primary" flat rounded="0">
      <div class="d-flex align-center justify-space-between mb-3">
        <div>
          <p class="text-body-1 font-weight-medium ma-0">Appearance</p>
          <p class="text-body-2 text-grey-darken-1 mt-1 mb-0">
            Choose between light and dark mode.
          </p>
        </div>

        <v-icon :icon="isDark ? '$WeatherNight' : '$WeatherSunny'" />
      </div>

      <v-btn-toggle
        v-model="themeMode"
        mandatory
        divided
        class="w-100"
        density="comfortable"
        variant="outlined"
      >
        <v-btn value="light" class="flex-grow-1">
          <v-icon start icon="$WeatherSunny" />
          Light
        </v-btn>

        <v-btn value="dark" class="flex-grow-1">
          <v-icon start icon="$WeatherNight" />
          Dark
        </v-btn>
      </v-btn-toggle>
    </v-card>
  </v-card>
</template>

<style scoped></style>
