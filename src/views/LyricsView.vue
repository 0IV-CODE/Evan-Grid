<script lang="ts">
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import StarterKit from '@tiptap/starter-kit'
import { Editor, EditorContent } from '@tiptap/vue-3'

type Song = {
  id: number
  title: string
  key: string
  tags: string[]
  content: string
  updatedAt: string
}

type AlignOpt = 'left' | 'center'

export default {
  name: 'LyricsView',

  components: {
    EditorContent,
  },

  data: () => ({
    editor: null as Editor | null,

    search: '',
    editorOpen: false,
    editingSongId: null as number | null,

    songForm: {
      title: '',
      key: '',
      tagsText: '',
    },

    songs: [
      {
        id: 1,
        title: 'Amazing Grace',
        key: 'G',
        tags: ['hymn', 'grace'],
        updatedAt: new Date().toISOString(),
        content: `
          <h3 style="text-align:center">Amazing Grace</h3>
          <p style="text-align:center">
            Amazing grace how sweet the sound<br>
            That saved a wretch like me
          </p>
        `,
      },
    ] as Song[],

    deleteDialog: false,
    songToDelete: null as Song | null,
  }),

  computed: {
    filteredSongs(): Song[] {
      const q = this.search.toLowerCase().trim()
      if (!q) return this.songs

      return this.songs.filter((song) => {
        return (
          song.title.toLowerCase().includes(q) ||
          song.key.toLowerCase().includes(q) ||
          song.tags.join(' ').toLowerCase().includes(q)
        )
      })
    },

    isEditing(): boolean {
      return this.editingSongId !== null
    },
  },

  mounted() {
    this.createEditor('')
  },

  beforeUnmount() {
    this.editor?.destroy()
  },

  methods: {
    createEditor(content: string) {
      this.editor?.destroy()

      this.editor = new Editor({
        extensions: [
          StarterKit,
          TextAlign.configure({
            types: ['heading', 'paragraph'],
          }),
          Highlight,
        ],
        content,
      })
    },

    openCreateSong() {
      this.editingSongId = null

      this.songForm = {
        title: '',
        key: '',
        tagsText: '',
      }

      this.createEditor(`
        <h3 style="text-align:center">New Song</h3>
        <p style="text-align:center">Paste or type song lyrics here...</p>
      `)

      this.editorOpen = true
    },

    openEditSong(song: Song) {
      this.editingSongId = song.id

      this.songForm = {
        title: song.title,
        key: song.key,
        tagsText: song.tags.join(', '),
      }

      this.createEditor(song.content)

      this.editorOpen = true
    },

    setLineH2() {
      this.editor?.chain().focus().setHeading({ level: 2 }).run()
    },

    setLineH3() {
      this.editor?.chain().focus().setHeading({ level: 3 }).run()
    },

    setLineText() {
      this.editor?.chain().focus().setParagraph().run()
    },

    toggleBold() {
      this.editor?.chain().focus().toggleBold().run()
    },

    toggleItalic() {
      this.editor?.chain().focus().toggleItalic().run()
    },

    toggleHighlight() {
      this.editor?.chain().focus().toggleHighlight().run()
    },

    setAlign(value: AlignOpt) {
      this.editor?.chain().focus().setTextAlign(value).run()
    },

    isControlActive(type: string, opts?: Record<string, unknown>) {
      if (!this.editor) return false
      return opts ? this.editor.isActive(type, opts) : this.editor.isActive(type)
    },

    controlVariant(type: string, opts?: Record<string, unknown>) {
      return this.isControlActive(type, opts) ? 'plain' : 'outlined'
    },

    controlColor(type: string, opts?: Record<string, unknown>) {
      return this.isControlActive(type, opts) ? 'accent' : undefined
    },

    saveSong() {
      if (!this.editor) return

      const now = new Date().toISOString()

      const songData: Song = {
        id: this.editingSongId ?? Date.now(),
        title: this.songForm.title || 'Untitled Song',
        key: this.songForm.key,
        tags: this.songForm.tagsText
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        content: this.editor.getHTML(),
        updatedAt: now,
      }

      if (this.isEditing) {
        this.songs = this.songs.map((song) => (song.id === this.editingSongId ? songData : song))
      } else {
        this.songs.unshift(songData)
      }

      this.closeEditor()
    },

    deleteSong(songId: number) {
      this.songs = this.songs.filter((song) => song.id !== songId)
    },

    closeEditor() {
      this.editorOpen = false
      this.editingSongId = null
    },

    formatDate(value: string) {
      return new Date(value).toLocaleDateString()
    },

    openDeleteDialog(song: Song) {
      this.songToDelete = song
      this.deleteDialog = true
    },

    cancelDelete() {
      this.songToDelete = null
      this.deleteDialog = false
    },

    confirmDeleteSong() {
      if (!this.songToDelete) return

      // remove song
      this.songs = this.songs.filter((song) => song.id !== this.songToDelete?.id)

      // close delete dialog
      this.deleteDialog = false

      // reset delete state
      this.songToDelete = null

      // close editor + return to list
      this.closeEditor()
    },
  },
}
</script>

<template>
  <v-card class="pa-0 mx-auto bg-primary" max-width="520" rounded="0" elevation="0">
    <v-card class="pa-4 border-b-sm bg-primary" flat rounded="0">
      <div class="d-flex align-center justify-space-between ga-3">
        <div>
          <p class="text-subtitle-1 font-weight-bold ma-0">Lyrics</p>
          <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
            Songs, Lyrics, choruses, and other music
          </p>
        </div>
      </div>

      <div class="d-flex">
        <v-text-field
          v-model="search"
          label="Search songs"
          variant="outlined"
          class="mt-4"
          hide-details
          density="compact"
          clearable
        />
        <v-btn color="secondary" class="mt-4 ml-4" variant="flat" @click="openCreateSong"
          >Add</v-btn
        >
      </div>
    </v-card>

    <v-card v-if="filteredSongs.length === 0" class="pa-4 bg-primary" flat rounded="0">
      <p class="text-body-2 text-medium-emphasis ma-0">No songs found.</p>
    </v-card>

    <v-list class="bg-primary pa-0">
      <v-list-item
        v-for="song in filteredSongs"
        :key="song.id"
        class="border-b-sm"
        @click="openEditSong(song)"
      >
        <template #prepend>
          <v-icon icon="$MusicNoteEighth" />
        </template>

        <v-list-item-title class="font-weight-bold">
          {{ song.title }}
        </v-list-item-title>

        <v-list-item-subtitle style="font-size: 12px">
          Key: {{ song.key || 'None' }} · Updated {{ formatDate(song.updatedAt) }}
        </v-list-item-subtitle>

        <v-list-item-subtitle v-if="song.tags.length" style="font-size: 12px">
          {{ song.tags.join(', ') }}
        </v-list-item-subtitle>

        <template #append>
          <v-btn
            icon="$TrashCanOutline"
            variant="text"
            size="small"
            @click.stop="openDeleteDialog(song)"
          />
        </template>
      </v-list-item>
    </v-list>

    <!-- create/edit dialog -->
    <v-dialog v-model="editorOpen" location="bottom" fullscreen class="bg-primary">
      <v-card class="pa-0 bg-primary" flat rounded="0">
        <!-- Top Bar -->
        <v-card class="px-4 py-0 bg-primary" flat rounded="0" height="220">
          <div class="d-flex align-center justify-space-between">
            <p class="text-subtitle-1 font-weight-bold ma-0">
              {{ isEditing ? 'Edit Song' : 'Create Song' }}
            </p>

            <v-btn icon="$Close" variant="text" @click="closeEditor" />
          </div>

          <v-text-field
            v-model="songForm.title"
            label="Song title"
            variant="outlined"
            class="mt-2"
            hide-details
            density="compact"
          />

          <v-text-field
            v-model="songForm.key"
            label="Key"
            variant="outlined"
            class="mt-1"
            hide-details
            density="compact"
          />

          <v-text-field
            v-model="songForm.tagsText"
            label="Tags"
            placeholder="hymn, worship, invitation"
            variant="outlined"
            class="mt-1"
            hide-details
            density="compact"
          />
        </v-card>

        <!-- Btn toggles - tools -->
        <v-card v-if="editor" class="px-3 py-2 border-b-sm bg-primary" flat rounded="0" height="95">
          <v-btn
            class="ma-1"
            size="small"
            :variant="controlVariant('heading', { level: 2 })"
            :color="controlColor('heading', { level: 2 })"
            @click="setLineH2"
          >
            H2
          </v-btn>

          <v-btn
            class="ma-1"
            size="small"
            :variant="controlVariant('heading', { level: 3 })"
            :color="controlColor('heading', { level: 3 })"
            @click="setLineH3"
          >
            H3
          </v-btn>

          <v-btn
            class="ma-1"
            size="small"
            :variant="controlVariant('paragraph')"
            :color="controlColor('paragraph')"
            @click="setLineText"
          >
            Text
          </v-btn>

          <v-btn
            class="ma-1"
            size="small"
            :variant="controlVariant('bold')"
            :color="controlColor('bold')"
            @click="toggleBold"
          >
            Bold
          </v-btn>

          <v-btn
            class="ma-1"
            size="small"
            :variant="controlVariant('italic')"
            :color="controlColor('italic')"
            @click="toggleItalic"
          >
            Italic
          </v-btn>

          <v-btn
            class="ma-1"
            size="small"
            :variant="controlVariant('highlight')"
            :color="controlColor('highlight')"
            @click="toggleHighlight"
          >
            Mark
          </v-btn>

          <v-btn
            class="ma-1"
            size="small"
            :variant="controlVariant({ textAlign: 'left' } as any)"
            :color="editor.isActive({ textAlign: 'left' }) ? 'accent' : undefined"
            @click="setAlign('left')"
          >
            Left
          </v-btn>

          <v-btn
            class="ma-1"
            size="small"
            :variant="editor.isActive({ textAlign: 'center' }) ? 'flat' : 'outlined'"
            :color="editor.isActive({ textAlign: 'center' }) ? 'accent' : undefined"
            @click="setAlign('center')"
          >
            Center
          </v-btn>
        </v-card>

        <!-- editor -->
        <v-card class="pa-4 bg-primary" flat rounded="0" height="70%" style="overflow-y: auto">
          <editor-content v-if="editor" :editor="editor" class="song-editor" />
        </v-card>

        <!-- bottom controls -->
        <v-card class="pa-4 bg-primary border-t-sm" flat rounded="0">
          <div class="d-flex ga-2">
            <!-- delete -->
            <v-btn
              v-if="isEditing"
              color="red"
              variant="outlined"
              size="large"
              @click="openDeleteDialog(songs.find((s) => s.id === editingSongId) as Song)"
            >
              Delete
            </v-btn>

            <!-- save -->
            <v-btn
              color="secondary"
              variant="flat"
              size="large"
              class="flex-grow-1"
              @click="saveSong"
            >
              Save Song
            </v-btn>
          </div>
        </v-card>
      </v-card>
    </v-dialog>

    <!-- delete song dialog -->
    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card class="pa-4 bg-primary" variant="outlined">
        <p class="text-subtitle-1 font-weight-bold ma-0">Delete song?</p>

        <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
          Are you sure you want to delete
          <strong>{{ songToDelete?.title }}</strong
          >?
        </p>

        <div class="d-flex justify-end ga-2 mt-6">
          <v-btn variant="outlined" @click="cancelDelete"> Cancel </v-btn>

          <v-btn color="red" variant="flat" @click="confirmDeleteSong"> Delete </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.song-editor {
  min-height: 320px;
}

.song-editor :deep(.tiptap) {
  min-height: 320px;
  outline: none;
  font-size: 1rem;
  line-height: 1.8;
}

.song-editor :deep(.tiptap p) {
  margin-bottom: 1rem;
}

.song-editor :deep(mark) {
  padding: 0.1rem 0.25rem;
  border-radius: 0.25rem;
}
</style>
