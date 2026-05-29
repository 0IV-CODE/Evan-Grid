<script lang="ts">
import { systemSt } from '@/stores/systemSt.js'

type menuOpts = 'map' | 'books' | 'lyrics' | 'journal' | 'network' | 'settings'

export default {
  name: 'AppMenu',

  data: () => ({
    systemSt: systemSt(),

    // false = main icons
    // true = more icons
    menuMoreOpen: false,
  }),

  mounted() {
    this.syncMenuWithRoute()
  },

  watch: {
    $route() {
      this.syncMenuWithRoute()
    },
  },

  methods: {
    syncMenuWithRoute() {
      const path = this.$route.path

      if (path === '/') {
        this.systemSt.menuOpenOpt = 'map'
        this.menuMoreOpen = false
      } else if (path.startsWith('/books')) {
        this.systemSt.menuOpenOpt = 'books'
        this.menuMoreOpen = false
      } else if (path.startsWith('/lyrics')) {
        this.systemSt.menuOpenOpt = 'lyrics'
        this.menuMoreOpen = false
      } else if (path.startsWith('/journal')) {
        this.systemSt.menuOpenOpt = 'journal'
        this.menuMoreOpen = false
      } else if (path.startsWith('/network')) {
        this.systemSt.menuOpenOpt = 'network'
        this.menuMoreOpen = true
      } else if (path.startsWith('/settings')) {
        this.systemSt.menuOpenOpt = 'settings'
        this.menuMoreOpen = true
      }
    },

    openMoreMenu() {
      this.menuMoreOpen = true
    },

    closeMoreMenu() {
      this.menuMoreOpen = false
    },

    menuRoute(opt: menuOpts) {
      this.systemSt.menuOpenOpt = opt
      this.go(opt)
    },

    go(opt: menuOpts) {
      switch (opt) {
        case 'map':
          this.$router.push('/')
          break
        case 'books':
          this.$router.push('/books')
          break
        case 'lyrics':
          this.$router.push('/lyrics')
          break
        case 'journal':
          this.$router.push('/journal')
          break
        case 'network':
          this.$router.push('/network')
          break
        case 'settings':
          this.$router.push('/settings')
          break
      }
    },
  },
}
</script>

<template>
  <v-bottom-navigation v-if="systemSt.menuOpen" class="bg-primary" elevation="0">
    <v-card class="px-4 ga-2 bg-primary d-flex justify-space-between w-100" rounded="0">
      <!-- MAIN MENU -->
      <template v-if="!menuMoreOpen">
        <v-btn
          stacked
          rounded="0"
          size="x-small"
          color="secondary"
          elevation="0"
          @click="menuRoute('map')"
        >
          <v-icon
            :color="systemSt.menuOpenOpt === 'map' ? 'accent' : 'grey'"
            icon="$MapSearchOutline"
          />
          <p :class="systemSt.menuOpenOpt === 'map' ? 'text-accent' : 'text-grey'">Map</p>
        </v-btn>

        <v-btn
          stacked
          rounded="0"
          size="x-small"
          color="secondary"
          elevation="0"
          @click="menuRoute('books')"
        >
          <v-icon
            :color="systemSt.menuOpenOpt === 'books' ? 'accent' : 'grey'"
            icon="$BookOpenPageVariantOutline"
          />
          <p :class="systemSt.menuOpenOpt === 'books' ? 'text-accent' : 'text-grey'">Books</p>
        </v-btn>

        <v-btn
          stacked
          rounded="0"
          size="x-small"
          color="secondary"
          elevation="0"
          @click="menuRoute('lyrics')"
        >
          <v-icon
            :color="systemSt.menuOpenOpt === 'lyrics' ? 'accent' : 'grey'"
            icon="$MusicNoteEighth"
          />
          <p :class="systemSt.menuOpenOpt === 'lyrics' ? 'text-accent' : 'text-grey'">Lyrics</p>
        </v-btn>

        <v-btn
          stacked
          rounded="0"
          size="x-small"
          color="secondary"
          elevation="0"
          @click="menuRoute('journal')"
        >
          <v-icon
            :color="systemSt.menuOpenOpt === 'journal' ? 'accent' : 'grey'"
            icon="$NotebookOutline"
          />
          <p :class="systemSt.menuOpenOpt === 'journal' ? 'text-accent' : 'text-grey'">Journal</p>
        </v-btn>

        <!-- MORE -->
        <v-btn
          stacked
          rounded="0"
          size="x-small"
          color="secondary"
          elevation="0"
          @click="openMoreMenu"
        >
          <v-icon color="grey" icon="$ChevronRight" />
          <p class="text-grey">More</p>
        </v-btn>
      </template>

      <!-- MORE MENU -->
      <template v-else>
        <!-- BACK -->
        <v-btn
          stacked
          rounded="0"
          size="x-small"
          color="secondary"
          elevation="0"
          @click="closeMoreMenu"
        >
          <v-icon color="grey" icon="$ChevronLeft" />
          <p class="text-grey">Back</p>
        </v-btn>

        <v-btn
          stacked
          rounded="0"
          size="x-small"
          color="secondary"
          elevation="0"
          @click="menuRoute('network')"
        >
          <v-icon
            :color="systemSt.menuOpenOpt === 'network' ? 'accent' : 'grey'"
            icon="$AccountNetworkOutline"
          />
          <p :class="systemSt.menuOpenOpt === 'network' ? 'text-accent' : 'text-grey'">Network</p>
        </v-btn>

        <v-btn
          stacked
          rounded="0"
          size="x-small"
          color="secondary"
          elevation="0"
          @click="menuRoute('settings')"
        >
          <v-icon :color="systemSt.menuOpenOpt === 'settings' ? 'accent' : 'grey'" icon="$Cog" />
          <p :class="systemSt.menuOpenOpt === 'settings' ? 'text-accent' : 'text-grey'">Settings</p>
        </v-btn>
      </template>
    </v-card>
  </v-bottom-navigation>
</template>
