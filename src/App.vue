<script lang="ts">
import AppMenu from '@/components/layout/AppMenu.vue'
import { useBackHandler } from '@/composables/useBackHandler'
import { useSwipeBack } from '@/composables/useSwipeBack'

const swipeBack = useSwipeBack()

export default {
  name: 'MainLayout',

  components: {
    AppMenu,
  },

  mounted() {
    const { setupBackHandler } = useBackHandler()

    setupBackHandler()
    swipeBack.addSwipeBack()
  },

  beforeUnmount() {
    swipeBack.removeSwipeBack()
  },
}
</script>

<template>
  <v-app>
    <v-main class="bg-primary">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </v-main>

    <AppMenu />
  </v-app>
</template>
