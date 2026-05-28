<script lang="ts">
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'

type NoteType = 'txt' | 'checklist'

type Folder = {
  id: string
  name: string
  color: string
}

type NoteEntry = {
  id: string
  type: NoteType
  title: string
  folderId: string
  color: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  content: any
  checklist: {
    id: string
    text: string
    done: boolean
  }[]
}

export default {
  name: 'JournalView',

  components: {
    EditorContent,
  },

  data: () => ({
    view: 'list' as 'list' | 'editor',

    selectedFolderId: 'all',
    activeNoteId: null as string | null,

    addDialog: false,
    folderDialog: false,
    folderSelectDialog: false,

    editor: null as Editor | null,

    folders: [
      { id: 'personal', name: 'Personal', color: '#ffc107' },
      { id: 'work', name: 'Work', color: '#3fc46b' },
      { id: 'others', name: 'Others', color: '#2b7cff' },
    ] as Folder[],

    notes: [
      {
        id: 'note_001',
        type: 'txt',
        title: 'Test',
        folderId: 'personal',
        color: '#ffc107',
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Test' }],
            },
          ],
        },
        checklist: [],
      },
    ] as NoteEntry[],

    newFolderName: '',
    newFolderColor: '#2b7cff',
    deleteFolderDialog: false,
    folderToDeleteId: null as string | null,
    searchText: '',
  }),

  computed: {
    filteredNotes(): NoteEntry[] {
      let list = this.notes

      if (this.selectedFolderId !== 'all') {
        list = list.filter((note) => note.folderId === this.selectedFolderId)
      }

      const search = (this.searchText || '').trim().toLowerCase()

      if (search) {
        list = list.filter((note) => note.title.toLowerCase().includes(search))
      }

      return [...list].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    },

    folderTabs(): Folder[] {
      return [{ id: 'all', name: 'All', color: '#2196f3' }, ...this.folders]
    },

    activeNote(): NoteEntry | undefined {
      return this.notes.find((note) => note.id === this.activeNoteId)
    },
  },

  mounted() {
    this.loadNotes()
  },

  beforeUnmount() {
    this.editor?.destroy()
  },

  methods: {
    createNote(type: NoteType) {
      const folder = this.folders[0]

      const note: NoteEntry = {
        id: crypto.randomUUID(),
        type,
        title: 'Title',
        folderId: folder.id,
        color: folder.color,
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
        checklist: type === 'checklist' ? [{ id: crypto.randomUUID(), text: '', done: false }] : [],
      }

      this.notes.unshift(note)
      this.saveNotes()

      this.addDialog = false
      this.openNote(note)
    },

    openNote(note: NoteEntry) {
      this.activeNoteId = note.id
      this.view = 'editor'

      this.editor?.destroy()
      this.editor = null

      if (note.type === 'txt') {
        this.editor = new Editor({
          content: note.content,
          extensions: [
            StarterKit,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({
              types: ['heading', 'paragraph'],
            }),
          ],
          onUpdate: ({ editor }) => {
            if (!this.activeNote) return

            this.activeNote.content = editor.getJSON()
            this.activeNote.updatedAt = new Date().toISOString()
            this.saveNotes()
          },
        })
      }
    },

    closeEditor() {
      this.view = 'list'
      this.activeNoteId = null
      this.editor?.destroy()
      this.editor = null
    },

    updateTitle(value: string) {
      if (!this.activeNote) return

      this.activeNote.title = value || 'Title'
      this.activeNote.updatedAt = new Date().toISOString()
      this.saveNotes()
    },

    getFolder(note: NoteEntry) {
      return this.folders.find((folder) => folder.id === note.folderId) || this.folders[0]
    },

    setFolder(folder: Folder) {
      if (!this.activeNote) return

      this.activeNote.folderId = folder.id
      this.activeNote.color = folder.color
      this.activeNote.updatedAt = new Date().toISOString()

      this.folderSelectDialog = false
      this.saveNotes()
    },

    togglePin() {
      if (!this.activeNote) return

      this.activeNote.pinned = !this.activeNote.pinned
      this.activeNote.updatedAt = new Date().toISOString()
      this.saveNotes()
    },

    deleteNote() {
      if (!this.activeNoteId) return

      this.notes = this.notes.filter((note) => note.id !== this.activeNoteId)
      this.saveNotes()
      this.closeEditor()
    },

    addChecklistItem() {
      if (!this.activeNote) return

      this.activeNote.checklist.push({
        id: crypto.randomUUID(),
        text: '',
        done: false,
      })

      this.activeNote.updatedAt = new Date().toISOString()
      this.saveNotes()
    },

    removeChecklistItem(id: string) {
      if (!this.activeNote) return

      this.activeNote.checklist = this.activeNote.checklist.filter((item) => item.id !== id)
      this.saveNotes()
    },

    formatTime(value: string) {
      return new Date(value).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    },

    addFolder() {
      if (!this.newFolderName.trim()) return

      this.folders.push({
        id: crypto.randomUUID(),
        name: this.newFolderName.trim(),
        color: this.newFolderColor,
      })

      this.newFolderName = ''
      this.newFolderColor = '#2b7cff'
      this.saveNotes()
    },

    deleteFolder(folderId: string) {
      const fallbackFolder = this.folders.find((folder) => folder.id !== folderId)

      if (!fallbackFolder) return

      this.notes = this.notes.map((note) => {
        if (note.folderId !== folderId) return note

        return {
          ...note,
          folderId: fallbackFolder.id,
          color: fallbackFolder.color,
        }
      })

      this.folders = this.folders.filter((folder) => folder.id !== folderId)

      if (this.selectedFolderId === folderId) {
        this.selectedFolderId = 'all'
      }

      this.saveNotes()
    },

    saveNotes() {
      localStorage.setItem('evangrid_journal_notes', JSON.stringify(this.notes))
      localStorage.setItem('evangrid_journal_folders', JSON.stringify(this.folders))
    },

    loadNotes() {
      const savedNotes = localStorage.getItem('evangrid_journal_notes')
      const savedFolders = localStorage.getItem('evangrid_journal_folders')

      if (savedNotes) this.notes = JSON.parse(savedNotes)
      if (savedFolders) this.folders = JSON.parse(savedFolders)
    },
  },
}
</script>

<template>
  <v-card
    class="pa-4 mx-auto bg-primary position-relative"
    max-width="520"
    min-height="100vh"
    rounded="0"
    elevation="0"
  >
    <!-- LIST -->
    <template v-if="view === 'list'">
      <!-- Top Bar -->
      <div class="d-flex align-center justify-space-between mb-5">
        <p class="text-h5 font-weight-bold my-0 mr-4">Journal</p>

        <v-text-field
          v-model="searchText"
          placeholder="Search titles"
          prepend-inner-icon="$Magnify"
          clearable
          variant="outlined"
          density="compact"
          hide-details
        />
        <v-btn icon="$InformationBoxOutline" variant="text" @click="folderDialog = true" />
      </div>

      <!-- Folders -->
      <div class="d-flex">
        <div class="d-flex align-center ga-3 overflow-x-auto">
          <v-btn
            v-for="folder in folderTabs"
            :key="folder.id"
            rounded="md"
            :color="folder.color"
            :variant="selectedFolderId === folder.id ? 'flat' : 'tonal'"
            @click="selectedFolderId = folder.id"
          >
            {{ folder.name }}
          </v-btn>
        </div>
      </div>

      <p class="text-h6 font-weight-bold text-grey mb-4">Notes</p>

      <!-- Each Card -->
      <v-card
        v-for="note in filteredNotes"
        :key="note.id"
        class="mb-2 pa-0"
        color="grey-darken-6"
        rounded="md"
        elevation="0"
        density="compact"
        @click="openNote(note)"
      >
        <v-row>
          <v-col cols="1" :style="{ backgroundColor: note.color }" />

          <v-col cols="11">
            <v-card-text class="py-2 px-0">
              <div class="d-flex align-center ga-2">
                <v-icon v-if="note.pinned" icon="$Pin" size="small" color="amber" />

                <p class="text-h6 font-weight-bold ma-0">
                  {{ note.title }}
                </p>
              </div>

              <div class="d-flex align-center ga-3 text-grey">
                <p class="text-body-2 text-grey ma-0">
                  {{ note.type === 'checklist' ? 'Checklist' : getFolder(note).name }}
                </p>

                <v-icon size="x-small" icon="$CalendarBlankOutline" />
                <span>{{ formatTime(note.updatedAt) }}</span>
              </div>
            </v-card-text>
          </v-col>
        </v-row>
      </v-card>

      <v-btn
        class="position-absolute"
        style="right: 20px; bottom: 90px; z-index: 10"
        variant="tonal"
        icon="$PencilOutline"
        color="blue"
        size="x-large"
        @click="addDialog = true"
      />
    </template>

    <!-- EDITOR -->
    <template v-if="view === 'editor' && activeNote">
      <div class="d-flex align-center justify-space-between mb-2">
        <v-btn icon="$ChevronLeft" variant="text" @click="closeEditor" />

        <div class="d-flex ga-2">
          <v-btn :icon="activeNote.pinned ? '$Pin' : '$PinOff'" variant="text" @click="togglePin" />
          <v-btn icon="$TrashCanOutline" variant="text" color="red" @click="deleteNote" />
        </div>
      </div>

      <div class="d-flex align-center justify-space-between">
        <p class="text-body-2 text-grey ma-0">Edited: {{ formatTime(activeNote.updatedAt) }}</p>

        <v-btn variant="text" @click="folderSelectDialog = true">
          <v-icon icon="$Circle" :color="activeNote.color" size="small" class="mr-2" />
          {{ getFolder(activeNote).name }}
        </v-btn>
      </div>

      <v-card class="pa-0" color="primary" rounded="lg" elevation="0">
        <v-btn
          class="mr-1"
          :variant="editor?.isActive('heading', { level: 1 }) ? 'flat' : 'tonal'"
          color="blue"
          @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
        >
          H1
        </v-btn>

        <v-btn
          class="mr-1"
          :variant="editor?.isActive('heading', { level: 2 }) ? 'flat' : 'tonal'"
          color="blue"
          @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
        >
          H2
        </v-btn>

        <v-btn
          class="mr-1"
          :variant="editor?.isActive('bold') ? 'flat' : 'tonal'"
          color="blue"
          @click="editor?.chain().focus().toggleBold().run()"
        >
          B
        </v-btn>

        <v-btn
          class="mr-1"
          :variant="editor?.isActive('italic') ? 'flat' : 'tonal'"
          color="blue"
          @click="editor?.chain().focus().toggleItalic().run()"
        >
          I
        </v-btn>

        <v-btn
          :variant="editor?.isActive('bulletList') ? 'flat' : 'text'"
          icon="$FormatListBulleted"
          @click="editor?.chain().focus().toggleBulletList().run()"
        />

        <v-btn icon="$ArrowULeftTop" variant="text" @click="editor?.chain().focus().undo().run()" />

        <v-btn
          icon="$ArrowURightTop"
          variant="text"
          @click="editor?.chain().focus().redo().run()"
        />
      </v-card>

      <v-text-field
        :model-value="activeNote.title"
        variant="plain"
        hide-details
        class="mb-4"
        @update:model-value="updateTitle"
      />

      <editor-content v-if="activeNote.type === 'txt'" :editor="editor" />

      <div v-else>
        <v-card
          v-for="item in activeNote.checklist"
          :key="item.id"
          class="pa-2 mb-2"
          color="primary"
          rounded="lg"
          elevation="0"
        >
          <div class="d-flex align-center ga-2">
            <v-checkbox v-model="item.done" hide-details @update:model-value="saveNotes" />

            <v-text-field
              v-model="item.text"
              placeholder="List item"
              variant="plain"
              hide-details
              @update:model-value="saveNotes"
            />

            <v-btn icon="$Close" variant="text" @click="removeChecklistItem(item.id)" />
          </div>
        </v-card>

        <v-btn prepend-icon="$Plus" variant="text" @click="addChecklistItem">Add</v-btn>
      </div>
    </template>

    <!-- ADD DIALOG -->
    <v-dialog v-model="addDialog" max-width="520">
      <v-card class="pa-4" rounded="xl">
        <v-card-title class="font-weight-bold">Add</v-card-title>

        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-card
                variant="tonal"
                class="pa-2 text-center"
                color="accent"
                rounded="lg"
                @click="createNote('txt')"
              >
                <v-card-text>
                  <v-icon icon="$FileDocumentOutline" size="small" />
                  <p class="text-caption font-weight-bold ma-0">TXT</p>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="6">
              <v-card
                variant="tonal"
                class="pa-2 text-center"
                color="accent"
                rounded="lg"
                @click="createNote('checklist')"
              >
                <v-card-text>
                  <v-icon icon="$CheckCircleOutline" size="small" />
                  <p class="text-caption font-weight-bold ma-0">Checklist</p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-btn variant="text" @click="addDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- FOLDER EDIT DIALOG -->
    <v-dialog v-model="folderDialog" fullscreen>
      <v-card class="pa-4" rounded="0">
        <div class="d-flex align-center justify-space-between">
          <v-card-title class="font-weight-bold">Groups</v-card-title>
          <v-btn color="blue" variant="text" @click="folderDialog = false">Done</v-btn>
        </div>

        <v-card-text class="pa-1">
          <!-- Add group -->
          <v-card class="pa-3 mb-2" color="primary" rounded="lg">
            <v-card-text class="pa-0 d-flex">
              <v-text-field
                v-model="newFolderName"
                label="Group name"
                variant="outlined"
                hide-details
                density="compact"
                class="mb-3"
              />

              <div class="d-flex align-center ga-3 mb-3 ml-4">
                <input
                  v-model="newFolderColor"
                  type="color"
                  style="
                    width: 30px;
                    height: 30px;
                    border: none;
                    background: none;
                    padding: 0;
                    cursor: pointer;
                  "
                />

                <!-- <v-text-field
                v-model="newFolderColor"
                label="Hex"
                variant="outlined"
                density="compact"
                hide-details
              /> -->
              </div>
            </v-card-text>
            <v-card-actions class="justify-end">
              <v-btn prepend-icon="$Plus" color="blue" variant="tonal" @click="addFolder">
                Add group
              </v-btn>
            </v-card-actions>
          </v-card>

          <!-- Edit / delete groups -->
          <v-card
            v-for="folder in folders"
            :key="folder.id"
            class="pa-1 mb-2"
            color="primary"
            rounded="lg"
          >
            <div class="d-flex align-center">
              <v-icon size="x-small" icon="$Circle" :color="folder.color" />

              <v-text-field
                v-model="folder.name"
                label="Name"
                variant="plain"
                hide-details
                class="ml-2"
                @update:model-value="saveNotes"
              />

              <div class="d-flex align-center">
                <input
                  v-model="folder.color"
                  type="color"
                  style="
                    width: 30px;
                    height: 30px;
                    border: none;
                    background: none;
                    padding: 0;
                    cursor: pointer;
                  "
                  @input="saveNotes"
                />

                <!-- <v-text-field
                  v-model="folder.color"
                  variant="plain"
                  hide-details
                  class="mt-n2"
                  @update:model-value="saveNotes"
                /> -->
              </div>

              <v-btn
                v-if="folders.length > 1"
                icon="$TrashCanOutline"
                variant="text"
                color="red"
                @click="deleteFolder(folder.id)"
              />
            </div>
          </v-card>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- FOLDER SELECT DIALOG -->
    <v-dialog v-model="folderSelectDialog" max-width="420">
      <v-card class="pa-4" rounded="xl">
        <v-card-title class="font-weight-bold">Folder</v-card-title>

        <v-list>
          <v-list-item v-for="folder in folders" :key="folder.id" @click="setFolder(folder)">
            <template #prepend>
              <v-icon icon="$Circle" :color="folder.color" />
            </template>

            <v-list-item-title>{{ folder.name }}</v-list-item-title>
          </v-list-item>
        </v-list>

        <v-card-actions>
          <v-btn variant="text" @click="folderSelectDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
:deep(.ProseMirror) {
  min-height: 55vh;
  outline: none;
  font-size: 1.2rem;
  line-height: 1.7;
}

:deep(.ProseMirror h1) {
  font-size: 2rem;
  font-weight: 700;
}

:deep(.ProseMirror h2) {
  font-size: 1.5rem;
  font-weight: 700;
}
</style>
