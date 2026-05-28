<script lang="ts">
type NetworkView = 'members' | 'body'

export default {
  name: 'NetworkList',

  data: () => ({
    view: 'members' as NetworkView,
    search: '',

    memberHeaders: [
      { title: 'Name', key: 'name' },
      { title: 'Phone', key: 'phone' },
      { title: 'Status', key: 'status' },
      { title: 'Body', key: 'body' },
    ],

    bodyHeaders: [
      { title: 'Body Name', key: 'name' },
      { title: 'City', key: 'city' },
      { title: 'Pastor', key: 'pastor' },
      { title: 'Members', key: 'membersCount' },
    ],

    members: [] as {
      name: string
      phone: string
      status: string
      church: string
    }[],

    body: [] as {
      name: string
      city: string
      pastor: string
      membersCount: number
    }[],
  }),

  computed: {
    activeHeaders() {
      return this.view === 'members' ? this.memberHeaders : this.bodyHeaders
    },

    activeItems() {
      return this.view === 'members' ? this.members : this.body
    },

    filteredItems() {
      if (!this.search.trim()) return this.activeItems

      const q = this.search.toLowerCase().trim()

      return this.activeItems.filter((item: any) =>
        Object.values(item).some((value) => String(value).toLowerCase().includes(q)),
      )
    },
  },

  methods: {
    setView(view: NetworkView) {
      this.view = view
      this.search = ''
    },

    clearSearch() {
      this.search = ''
    },
  },
}
</script>

<template>
  <v-card class="pa-0 mx-auto bg-primary" max-width="520" rounded="0" elevation="0">
    <!-- Tech Header -->
    <v-card class="pa-4 border-b-sm bg-primary" flat rounded="0">
      <p class="text-h6 font-weight-bold ma-0">Network</p>

      <p class="text-body-2 text-medium-emphasis mt-1 mb-0">members, locations, and alt info</p>
    </v-card>

    <!-- Search -->
    <v-card class="pa-3 bg-primary border-b-sm" flat rounded="0">
      <v-text-field
        v-model="search"
        label="Search network"
        placeholder="Search name, phone, church, city..."
        variant="outlined"
        hide-details
        clearable
        density="compact"
        prepend-inner-icon="$Magnify"
        @click:clear="clearSearch"
      />
    </v-card>

    <!-- Switch Buttons -->
    <v-card class="pa-2 d-flex ga-2 border-b-sm bg-primary" flat rounded="0">
      <v-btn
        :variant="view === 'members' ? 'flat' : 'outlined'"
        :color="view === 'members' ? 'secondary' : undefined"
        @click="setView('members')"
      >
        Members
      </v-btn>

      <v-btn
        :variant="view === 'body' ? 'flat' : 'outlined'"
        :color="view === 'body' ? 'secondary' : undefined"
        @click="setView('body')"
      >
        Body
      </v-btn>
    </v-card>

    <!-- Status Bar -->
    <v-card class="bg-primary border-b-sm" flat rounded="0" align="end">
      <p class="text-caption text-medium-emphasis my-0 mr-2">Records: {{ filteredItems.length }}</p>
    </v-card>

    <!-- Virtual Table -->
    <v-data-table-virtual
      :headers="activeHeaders"
      :items="filteredItems"
      height="500"
      item-value="name"
      fixed-header
      density="compact"
      class="bg-primary"
    >
      <template #no-data>
        <div class="pa-6 text-center text-medium-emphasis">No {{ view }} found.</div>
      </template>
    </v-data-table-virtual>
  </v-card>
</template>

<style scoped></style>
