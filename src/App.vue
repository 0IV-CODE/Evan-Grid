<script lang="ts">
// import { globalSt } from '@/stores/globalSt.js'
import AppMenu from '@/components/layout/AppMenu.vue'

export default {
  name: 'MainLayout',

  components: {
    AppMenu,
  },

  data: () => ({
    // globalSt: globalSt(),
  }),
}
</script>

<template>
  <v-app>
    <!-- Main Content -->
    <v-main class="bg-primary">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </v-main>

    <!-- Global Menu Dialog -->
    <AppMenu />
  </v-app>
</template>
