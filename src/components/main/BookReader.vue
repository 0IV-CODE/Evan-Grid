<script lang="ts">
import { bibleNotesDb, type BibleNote } from '@/db/bibleNotesDb'

type BibleVerse = {
  verse: string
  text: string
}

type BibleChapter = {
  chapter: string
  verses: BibleVerse[]
}

type BibleBook = {
  book: string
  chapters: BibleChapter[]
}

type FlatVerse = {
  id: string
  book: string
  chapter: string
  verse: string
  text: string
  isChapterStart: boolean
}

const bibleFiles = import.meta.glob('@/data/bible/en_kjv/*.json')

const bibleBookOrder = [
  // Old Testament
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalms',
  'Proverbs',
  'Ecclesiastes',
  'Song of Solomon',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',

  // New Testament
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation',
]

export default {
  name: 'BookReader',

  data: () => ({
    drawer: false,

    books: [] as BibleBook[],
    currentBookName: '',
    currentChapter: '1',

    flatVerses: [] as FlatVerse[],
    bookSearch: '',

    // text zoom
    textScale: 1,

    // verse annotation UI
    bookmarkDialog: false,
    bookmarksDialog: false,

    // loading
    versesLoading: true,
    versesLoadingText: 'Loading Bible...',

    selectedVerseIds: [] as string[],
    activeVerse: null as FlatVerse | null,

    annotationComment: '',
    annotationTags: [] as string[],
    customTag: '',
    annotationColor: '#FFF59D',

    bookmarkSearch: '',
    bookmarkTagFilter: '',

    noteToDelete: null as BibleNote | null,
    deleteBookmarkDialog: false,

    notes: [] as BibleNote[],
    activeNote: null as BibleNote | null,

    highlightColors: [
      '#FFF500',
      '#FFF59D',
      '#4CF06A',
      '#18C6E8',
      '#64B5F6',
      '#FFC76B',
      '#E86FDB',
      '#A000F5',
    ] as string[],
  }),

  computed: {
    filteredBooks(): BibleBook[] {
      const search = this.bookSearch.toLowerCase().trim()

      if (!search) return this.books

      return this.books.filter((book) => {
        return book.book.toLowerCase().includes(search)
      })
    },

    currentBook(): BibleBook | undefined {
      return this.books.find((book) => book.book === this.currentBookName)
    },

    chapterItems(): string[] {
      return this.currentBook?.chapters.map((chapter) => chapter.chapter) ?? []
    },

    currentChapterIndex(): number {
      return this.chapterItems.findIndex((chapter) => chapter === this.currentChapter)
    },

    hasPreviousChapter(): boolean {
      return this.currentChapterIndex > 0
    },

    hasNextChapter(): boolean {
      return this.currentChapterIndex < this.chapterItems.length - 1
    },

    selectedVerseNote(): BibleNote | undefined {
      const verse = this.primarySelectedVerse
      if (!verse) return undefined

      return this.getVerseNote(verse.id)
    },

    allBookmarks(): BibleNote[] {
      return [...this.notes].sort((a, b) => {
        return b.updatedAt - a.updatedAt
      })
    },

    allTags(): string[] {
      const tags = new Set<string>()

      this.allBookmarks.forEach((bookmark) => {
        bookmark.tags?.forEach((tag) => tags.add(tag))
      })

      return Array.from(tags).sort()
    },

    annotationAvailableTags(): string[] {
      return [...new Set([...this.allTags, ...this.annotationTags])].sort()
    },

    filteredBookmarks(): BibleNote[] {
      const search = this.bookmarkSearch.toLowerCase().trim()
      const tag = this.bookmarkTagFilter

      return this.allBookmarks.filter((note) => {
        const verseText = note.verses
          .map((verse) => {
            return `${verse.book} ${verse.chapter}:${verse.verse} ${verse.text}`
          })
          .join(' ')
          .toLowerCase()

        const matchesSearch =
          !search ||
          verseText.includes(search) ||
          String(note.comment ?? '')
            .toLowerCase()
            .includes(search)

        const matchesTag = !tag || note.tags?.includes(tag)

        return matchesSearch && matchesTag
      })
    },

    selectedVerses(): FlatVerse[] {
      const selected = new Set(this.selectedVerseIds)

      return this.flatVerses.filter((verse) => selected.has(verse.id))
    },

    primarySelectedVerse(): FlatVerse | null {
      return this.selectedVerses[0] ?? this.activeVerse ?? null
    },

    hasSelectedVerses(): boolean {
      return this.selectedVerseIds.length > 0
    },
  },

  async mounted() {
    this.versesLoading = true

    try {
      await this.loadBible()
      await this.loadNotes()

      if (this.books.length) {
        this.currentBookName = this.books[0].book
        this.currentChapter = '1'
        this.buildFlatVerses()
      }
    } finally {
      this.versesLoading = false
    }
  },

  methods: {
    async loadBible() {
      const loadedBooks: BibleBook[] = []

      for (const path in bibleFiles) {
        const mod: any = await bibleFiles[path]()

        // JSON files usually load under mod.default
        const bookData = mod.default ?? mod

        // Safety check
        if (!bookData.book || !Array.isArray(bookData.chapters)) {
          // console.warn('Invalid Bible JSON file:', path, bookData)
          continue
        }

        loadedBooks.push(bookData)
      }

      this.books = loadedBooks.sort((a, b) => {
        return bibleBookOrder.indexOf(a.book) - bibleBookOrder.indexOf(b.book)
      })
    },

    buildFlatVerses() {
      const book = this.currentBook
      if (!book) return

      const verses: FlatVerse[] = []

      book.chapters.forEach((chapter) => {
        chapter.verses.forEach((verse, index) => {
          verses.push({
            id: `${book.book}-${chapter.chapter}-${verse.verse}`,
            book: book.book,
            chapter: chapter.chapter,
            verse: verse.verse,
            text: verse.text,
            isChapterStart: index === 0,
          })
        })
      })

      this.flatVerses = verses
    },

    openBookChapters(bookName: string) {
      this.currentBookName = bookName
      this.currentChapter = '1'
      this.buildFlatVerses()
    },

    selectBook(bookName: string) {
      this.currentBookName = bookName
      this.currentChapter = '1'
      this.buildFlatVerses()

      this.$nextTick(() => {
        this.scrollToChapter('1')
      })
    },

    previousChapter() {
      if (!this.hasPreviousChapter) return

      const chapter = this.chapterItems[this.currentChapterIndex - 1]
      this.selectChapter(chapter)
    },

    nextChapter() {
      if (!this.hasNextChapter) return

      const chapter = this.chapterItems[this.currentChapterIndex + 1]
      this.selectChapter(chapter)
    },

    selectChapter(chapter: string) {
      this.currentChapter = chapter
      this.drawer = false

      this.$nextTick(() => {
        this.scrollToChapter(chapter)
      })
    },

    scrollToChapter(chapter: string) {
      const chapterStartIndex = this.flatVerses.findIndex((item) => {
        return item.chapter === chapter && item.isChapterStart
      })

      if (chapterStartIndex === -1) return

      const scroller = this.$refs.verseScroller as any

      if (scroller?.scrollToIndex) {
        scroller.scrollToIndex(chapterStartIndex)
      }
    },

    updateCurrentChapter() {
      const chapterEls = document.querySelectorAll('[data-bible-chapter]')

      let visibleChapter = this.currentChapter

      chapterEls.forEach((el) => {
        const rect = el.getBoundingClientRect()

        if (rect.top <= 130) {
          visibleChapter = String((el as HTMLElement).dataset.bibleChapter)
        }
      })

      this.currentChapter = visibleChapter
    },

    async loadNotes() {
      this.notes = await bibleNotesDb.notes.orderBy('updatedAt').reverse().toArray()
    },

    getVerseNote(verseId: string): BibleNote | undefined {
      return this.notes.find((note) => {
        return note.verses.some((verse) => verse.verseId === verseId)
      })
    },

    selectVerse(item: FlatVerse) {
      const isSelected = this.selectedVerseIds.includes(item.id)

      if (isSelected) {
        this.selectedVerseIds = this.selectedVerseIds.filter((id) => id !== item.id)

        if (this.activeVerse?.id === item.id) {
          this.activeVerse = this.selectedVerses[0] ?? null
        }

        return
      }

      this.selectedVerseIds = [...this.selectedVerseIds, item.id]
      this.activeVerse = item

      const existing = this.getVerseNote(item.id)

      this.activeNote = existing ?? null
      this.annotationComment = String(existing?.comment ?? '')
      this.annotationTags = this.normalizeTags(existing?.tags)
      this.annotationColor = String(existing?.highlightColor || '#FFF59D')
    },

    isVerseSelected(verseId: string): boolean {
      return this.selectedVerseIds.includes(verseId)
    },

    openBookmarkDialog() {
      if (!this.selectedVerses.length) return

      const firstVerse = this.selectedVerses[0]
      this.activeVerse = firstVerse

      const existing = this.getVerseNote(firstVerse.id)

      this.activeNote = existing ?? null
      this.annotationComment = String(existing?.comment ?? '')
      this.annotationTags = this.normalizeTags(existing?.tags)
      this.annotationColor = String(existing?.highlightColor || '#FFF59D')

      this.bookmarkDialog = true
    },

    openBookmarksDialog() {
      this.bookmarksDialog = true
    },

    addCustomTag() {
      const tag = this.customTag.trim().toLowerCase()
      if (!tag) return

      this.annotationTags = [...new Set([...this.annotationTags, tag])]
      this.customTag = ''
    },

    toggleTag(tag: string) {
      if (this.annotationTags.includes(tag)) {
        this.annotationTags = this.annotationTags.filter((item) => item !== tag)
        return
      }

      this.annotationTags = [...this.annotationTags, tag]
    },

    async saveVerseAnnotation() {
      const now = Date.now()

      const cleanTags = Array.isArray(this.annotationTags)
        ? this.annotationTags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
        : []

      const uniqueTags = [...new Set(cleanTags)]

      const verses = this.selectedVerses.map((verse) => ({
        verseId: String(verse.id),
        book: String(verse.book),
        chapter: String(verse.chapter),
        verse: String(verse.verse),
        text: String(verse.text),
      }))

      const payload: BibleNote = {
        id: this.activeNote?.id,
        verses,
        comment: String(this.annotationComment ?? '').trim(),
        tags: uniqueTags,
        highlightColor: String(this.annotationColor || '#FFF59D'),
        createdAt: this.activeNote?.createdAt ?? now,
        updatedAt: now,
      }

      const id = await bibleNotesDb.notes.put(JSON.parse(JSON.stringify(payload)))

      const savedNote = {
        ...payload,
        id,
      }

      this.notes = [savedNote, ...this.notes.filter((note) => note.id !== id)]

      this.selectedVerseIds = []
      this.activeVerse = null
      this.activeNote = null
      this.bookmarkDialog = false
    },

    noteVerseToFlatVerse(note: BibleNote): FlatVerse | null {
      const verse = note.verses[0]
      if (!verse) return null

      return {
        id: String(verse.verseId),
        book: String(verse.book),
        chapter: String(verse.chapter),
        verse: String(verse.verse),
        text: String(verse.text),
        isChapterStart: false,
      }
    },

    editBookmark(note: BibleNote) {
      this.activeNote = note
      this.selectedVerseIds = note.verses.map((verse) => verse.verseId)

      const firstVerse = this.noteVerseToFlatVerse(note)
      this.activeVerse = firstVerse

      this.annotationComment = String(note.comment ?? '')
      this.annotationTags = this.normalizeTags(note.tags)
      this.annotationColor = String(note.highlightColor || '#FFF59D')

      this.bookmarkDialog = true
    },

    normalizeTags(tags: unknown): string[] {
      if (!Array.isArray(tags)) return []

      return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))]
    },

    async deleteBookmark(note: BibleNote) {
      if (!note.id) return

      await bibleNotesDb.notes.delete(note.id)

      this.notes = this.notes.filter((item) => item.id !== note.id)
    },

    goToBookmark(note: BibleNote) {
      const firstVerse = note.verses[0]
      if (!firstVerse) return

      this.bookmarksDialog = false
      this.currentBookName = firstVerse.book
      this.currentChapter = firstVerse.chapter
      this.buildFlatVerses()

      this.activeNote = note
      this.activeVerse = this.noteVerseToFlatVerse(note)
      this.selectedVerseIds = note.verses.map((verse) => verse.verseId)

      this.$nextTick(() => {
        const index = this.flatVerses.findIndex((item) => item.id === firstVerse.verseId)
        const scroller = this.$refs.verseScroller as any

        if (index !== -1 && scroller?.scrollToIndex) {
          scroller.scrollToIndex(index)
        }
      })
    },

    zoomInText() {
      this.textScale = Math.min(this.textScale + 0.1, 1.8)
    },

    zoomOutText() {
      this.textScale = Math.max(this.textScale - 0.1, 0.8)
    },

    getBookInitial(book?: string) {
      return book?.trim()?.charAt(0)?.toUpperCase() || 'B'
    },

    confirmDeleteBookmark(note: BibleNote) {
      this.noteToDelete = note
      this.deleteBookmarkDialog = true
    },

    cancelDeleteBookmark() {
      this.noteToDelete = null
      this.deleteBookmarkDialog = false
    },

    async deleteConfirmedBookmark() {
      if (!this.noteToDelete) return

      const deletedVerseIds = this.noteToDelete.verses.map((verse) => verse.verseId)

      await this.deleteBookmark(this.noteToDelete)

      this.selectedVerseIds = this.selectedVerseIds.filter((id) => {
        return !deletedVerseIds.includes(id)
      })

      this.activeVerse = null
      this.activeNote = null
      this.noteToDelete = null
      this.deleteBookmarkDialog = false
      this.bookmarkDialog = false
    },

    confirmDeleteSelectedVerseAnnotation() {
      const note = this.selectedVerseNote
      if (!note) return

      this.noteToDelete = note
      this.deleteBookmarkDialog = true
    },
  },
}
</script>

<template>
  <v-card class="pa-0 mx-auto rounded-0" max-width="600" rounded="0" elevation="0">
    <!-- Bible Reader -->
    <v-card class="pa-0" rounded="0" elevation="0">
      <div v-if="versesLoading" class="verse-skeleton px-2 py-8">
        <div class="text-center mb-8">
          <v-skeleton-loader type="heading" width="180" class="mx-auto mb-4" />

          <v-skeleton-loader type="avatar" width="80" height="80" class="mx-auto" />
        </div>

        <div v-for="index in 10" :key="index" class="mb-5">
          <div class="d-flex align-start ga-3">
            <v-skeleton-loader type="text" width="24" />

            <div class="flex-grow-1">
              <v-skeleton-loader type="paragraph" />
            </div>
          </div>
        </div>
      </div>
      <v-virtual-scroll
        v-else
        ref="verseScroller"
        :items="flatVerses"
        height="100vh"
        :item-height="Math.round(105 * textScale)"
        @scroll.passive="updateCurrentChapter"
      >
        <template #default="{ item }">
          <div :id="item.id" class="px-6 py-2">
            <div
              v-if="item.isChapterStart"
              :data-bible-chapter="item.chapter"
              class="text-center my-6"
            >
              <p class="text-h5 font-weight-bold mb-1">
                {{ item.book }}
              </p>

              <p style="font-size: 60px" class="pa-0 ma-0">{{ item.chapter }}</p>
            </div>

            <p
              class="text-body-1 mb-n6 bible-text verse-clickable"
              :class="{
                'verse-has-note': getVerseNote(item.id),
                'verse-selected': isVerseSelected(item.id),
              }"
              :style="{
                fontSize: `${16 * textScale}px`,
                '--verse-highlight-color': getVerseNote(item.id)?.highlightColor || 'transparent',
              }"
              @click="selectVerse(item)"
            >
              <span class="text-caption font-weight-bold text-grey mr-1">
                {{ item.verse }}
              </span>

              {{ item.text }}
            </p>
          </div>
        </template>
      </v-virtual-scroll>
    </v-card>

    <!-- Bottom Chapter Nav -->
    <v-bottom-navigation class="bg-primary mb-14" elevation="1" rounded="t-xl">
      <v-card class="px-4 ga-2 bg-primary d-flex justify-space-between w-100" rounded="0">
        <v-btn
          size="x-small"
          icon="$ChevronLeft"
          variant="text"
          :disabled="!hasPreviousChapter"
          @click="previousChapter"
        />

        <v-btn
          size="x-small"
          variant="text"
          class="text-none font-weight-bold"
          @click="drawer = true"
        >
          {{ currentBookName }} {{ currentChapter }}
        </v-btn>

        <v-btn
          size="x-small"
          icon="$ChevronRight"
          variant="text"
          :disabled="!hasNextChapter"
          @click="nextChapter"
        />

        <v-btn
          stacked
          rounded="0"
          size="x-small"
          color="secondary"
          elevation="0"
          :disabled="!hasSelectedVerses"
          @click="openBookmarkDialog"
        >
          <v-icon
            :class="selectedVerseIds.length >= 1 ? 'text-accent' : ''"
            size="small"
            icon="$BookmarkOutline"
          />
          <span :class="selectedVerseIds.length >= 1 ? 'text-accent' : ''">{{
            selectedVerseIds.length > 1 ? `Note ${selectedVerseIds.length}` : 'Note'
          }}</span>
        </v-btn>

        <v-btn
          stacked
          rounded="0"
          size="x-small"
          color="secondary"
          elevation="0"
          @click="openBookmarksDialog"
        >
          <v-icon size="small" icon="$BookmarkMultiple" />
          <span>Bookmarks</span>
        </v-btn>
      </v-card>
    </v-bottom-navigation>

    <!-- Single Bookmark -->
    <v-dialog v-model="bookmarkDialog" fullscreen>
      <v-card rounded="0" color="background">
        <!-- Header -->
        <v-card-title class="d-flex align-center justify-space-between px-4 py-3">
          <div class="d-flex align-center ga-3">
            <v-btn icon="$ChevronLeft" variant="text" @click="bookmarkDialog = false" />

            <span class="text-h5 font-weight-bold">Note</span>
          </div>

          <v-btn
            rounded="xl"
            color="green"
            variant="flat"
            :disabled="!primarySelectedVerse"
            @click="saveVerseAnnotation"
          >
            Save
          </v-btn>
        </v-card-title>

        <v-card-text v-if="selectedVerses.length" class="px-4 pt-4 note-dialog-content">
          <!-- Note input -->
          <v-textarea
            v-model="annotationComment"
            placeholder="What would you like to say?"
            variant="solo-filled"
            rounded="lg"
            rows="5"
            auto-grow
            flat
            hide-details
            class="mb-4"
          />

          <!-- Verse preview -->
          <div v-for="verse in selectedVerses" :key="verse.id" class="d-flex ga-4 mb-4">
            <div class="note-quote-line" />

            <div>
              <p class="text-caption mb-4 note-verse-text">
                <sup class="text-medium-emphasis mr-1">
                  {{ verse.verse }}
                </sup>

                {{ verse.text }}
              </p>

              <p class="text-caption font-weight-bold mb-0">
                {{ verse.book }} {{ verse.chapter }}:{{ verse.verse }}
              </p>
            </div>
          </div>
        </v-card-text>

        <!-- Bottom tools -->
        <v-card-actions class="note-bottom-actions px-4 pt-2 pb-6">
          <div class="w-100">
            <!-- Labels -->
            <div class="d-flex ga-2 mb-4 note-scroll-row">
              <v-chip
                size="small"
                prepend-icon="$Tag"
                variant="plain"
                class="font-weight-bold"
                readonly
              >
                Attached Labels
              </v-chip>

              <v-chip
                v-for="tag in annotationAvailableTags"
                :key="tag"
                size="small"
                :variant="annotationTags.includes(tag) ? 'flat' : 'outlined'"
                :color="annotationTags.includes(tag) ? 'accent' : undefined"
                class="font-weight-bold"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </v-chip>
            </div>

            <div v-if="annotationTags.length" class="d-flex flex-wrap ga-2 mb-5">
              <v-chip
                v-for="tag in annotationTags"
                :key="tag"
                closable
                size="small"
                color="accent"
                variant="tonal"
                @click:close="toggleTag(tag)"
              >
                {{ tag }}
              </v-chip>
            </div>

            <!-- Custom label -->
            <div class="d-flex ga-2 mb-5">
              <v-text-field
                v-model="customTag"
                placeholder="Custom label"
                variant="outlined"
                density="compact"
                rounded="xl"
                hide-details
                @keyup.enter="addCustomTag"
              />

              <v-btn rounded="xl" variant="tonal" @click="addCustomTag"> Add </v-btn>
            </div>

            <!-- 8 highlight colors -->
            <div class="d-flex align-center ga-4 note-scroll-row pb-1">
              <button
                v-for="color in highlightColors"
                :key="color"
                type="button"
                class="note-color-btn"
                :class="{ 'note-color-btn-active': annotationColor === color }"
                :style="{ backgroundColor: color }"
                @click="annotationColor = color"
              />
            </div>

            <v-btn
              v-if="selectedVerseNote"
              block
              color="error"
              variant="tonal"
              class="mt-6 text-none"
              @click="confirmDeleteSelectedVerseAnnotation"
            >
              Delete Bookmark
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- multiple bookmarks -->
    <v-dialog v-model="bookmarksDialog" fullscreen>
      <v-card rounded="0" color="background">
        <!-- Header -->
        <v-card-title class="saved-header d-flex align-center justify-space-between px-4 py-3">
          <div class="d-flex align-center ga-3">
            <v-btn icon="$ChevronLeft" variant="text" @click="bookmarksDialog = false" />

            <span class="text-h5 font-weight-bold">Saved</span>
          </div>

          <div class="d-flex align-center ga-2">
            <v-btn disabled icon="$Tag" variant="text" />

            <v-chip size="small" variant="tonal">
              {{ allBookmarks.length }}
            </v-chip>
          </div>
        </v-card-title>

        <v-card-text class="px-4 pt-2 pb-8">
          <!-- Filter chips -->
          <div class="saved-tabs d-flex ga-2 pb-4">
            <v-chip
              :variant="!bookmarkTagFilter ? 'flat' : 'tonal'"
              :color="!bookmarkTagFilter ? 'surface' : undefined"
              class="font-weight-bold"
              @click="bookmarkTagFilter = ''"
            >
              All
            </v-chip>

            <v-chip
              v-for="tag in allTags"
              :key="tag"
              :variant="bookmarkTagFilter === tag ? 'flat' : 'tonal'"
              :color="bookmarkTagFilter === tag ? 'surface' : undefined"
              class="font-weight-bold"
              @click="bookmarkTagFilter = tag"
            >
              {{ tag }}
            </v-chip>
          </div>

          <!-- Search -->
          <v-text-field
            v-model="bookmarkSearch"
            prepend-inner-icon="$Magnify"
            placeholder="Search saved verses"
            variant="solo-filled"
            rounded="xl"
            density="compact"
            clearable
            flat
            hide-details
            class="mb-4"
          />

          <v-alert
            v-if="!filteredBookmarks.length"
            type="info"
            density="compact"
            variant="tonal"
            text="No bookmarks found."
            class="mt-4"
          />

          <!-- Saved cards -->
          <v-card
            v-for="note in filteredBookmarks"
            :key="note.id"
            rounded="xl"
            elevation="0"
            color="surface"
            class="mb-4 border-sm"
          >
            <v-card-text class="pa-5">
              <div class="d-flex align-start ga-4">
                <!-- Circle marker without v-avatar -->
                <div class="d-flex align-center justify-center font-weight-bold text-h6">
                  {{ getBookInitial(note.book) }}
                </div>

                <div class="flex-grow-1">
                  <!-- Title row -->
                  <div class="d-flex align-start justify-space-between ga-3">
                    <div class="text-h6 font-weight-regular line-height-tight">
                      You saved
                      <strong v-if="note.verses.length === 1">
                        {{ note.verses[0].book }} {{ note.verses[0].chapter }}:{{
                          note.verses[0].verse
                        }}
                      </strong>

                      <strong v-else-if="note.verses.length > 1">
                        {{ note.verses.length }} verses
                      </strong>

                      <strong v-else> a note </strong>
                    </div>

                    <div
                      v-if="note.highlightColor"
                      class="bookmark-color-dot mt-2"
                      :style="{ backgroundColor: note.highlightColor }"
                    />
                  </div>

                  <!-- Tags -->
                  <div
                    v-if="note.tags?.length"
                    class="d-flex align-center flex-wrap ga-1 mt-2 text-medium-emphasis text-caption"
                  >
                    <v-icon size="16" icon="$Tag" />

                    <v-chip
                      v-for="tag in note.tags"
                      :key="tag"
                      size="x-small"
                      variant="text"
                      class="px-1"
                      @click="bookmarkTagFilter = tag"
                    >
                      {{ tag }}
                    </v-chip>
                  </div>

                  <!-- Verse quote -->
                  <div v-if="note.verses.length" class="d-flex ga-4 mt-6">
                    <div class="saved-quote-line" />

                    <div>
                      <div v-for="verse in note.verses" :key="verse.verseId" class="mb-3">
                        <p class="text-body-1 mb-1 saved-verse-text">
                          <sup class="text-medium-emphasis mr-1">
                            {{ verse.verse }}
                          </sup>

                          {{ verse.text }}
                        </p>

                        <p class="text-subtitle-2 font-weight-bold mb-0">
                          {{ verse.book }} {{ verse.chapter }}:{{ verse.verse }} KJV
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Note without v-sheet -->
                  <div v-if="note.comment" class="pa-4 mt-5 rounded-lg bg-surface-variant">
                    <p class="ma-0 text-body-2">
                      {{ note.comment }}
                    </p>
                  </div>
                </div>
              </div>
            </v-card-text>

            <v-card-actions class="px-5 pt-0 pb-4 d-flex align-center ga-1">
              <v-btn
                prepend-icon="$ArrowULeftTop"
                variant="text"
                class="text-none"
                @click="goToBookmark(note)"
              >
                View
              </v-btn>

              <v-btn
                prepend-icon="$CommentOutline"
                variant="text"
                class="text-none"
                @click="editBookmark(note)"
              >
                Edit
              </v-btn>

              <v-btn
                prepend-icon="$TrashCanOutline"
                color="error"
                variant="text"
                class="text-none"
                @click="confirmDeleteBookmark(note)"
              >
                Delete
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Confirm Delete Bookmark -->
    <v-dialog v-model="deleteBookmarkDialog" max-width="340">
      <v-card rounded="xl">
        <v-card-title class="text-h6 font-weight-bold pb-1"> Delete note? </v-card-title>

        <v-card-text class="pt-2">
          <p class="mb-3">Are you sure you want to delete this saved note?</p>

          <p class="text-body-2 text-medium-emphasis mb-0">This action cannot be undone.</p>

          <p v-if="noteToDelete?.verses.length" class="text-caption text-medium-emphasis mt-3 mb-0">
            {{ noteToDelete.verses.length }} linked verse{{
              noteToDelete.verses.length > 1 ? 's' : ''
            }}
          </p>

          <p v-else-if="noteToDelete" class="text-caption text-medium-emphasis mt-3 mb-0">
            General note
          </p>
        </v-card-text>

        <v-card-actions class="px-4 pb-4 d-flex justify-end ga-2">
          <v-btn variant="text" @click="cancelDeleteBookmark"> Cancel </v-btn>

          <v-btn color="error" variant="flat" @click="deleteConfirmedBookmark"> Delete </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Book & Chapter Dialog -->
    <v-dialog v-model="drawer" fullscreen>
      <v-card class="pa-0 bg-primary" elevation="0" rounded="0">
        <!-- Header -->
        <v-card class="px-4 pt-2 d-flex align-center ga-4" rounded="0" elevation="0">
          <v-btn icon="$ChevronLeft" variant="text" @click="drawer = false" />

          <p class="text-h6 font-weight-bold ma-0">Books</p>
        </v-card>

        <!-- Search -->
        <v-card class="py-2 px-3" rounded="0" elevation="0">
          <v-text-field
            v-model="bookSearch"
            prepend-inner-icon="$Magnify"
            :append-inner-icon="bookSearch ? '$Close' : ''"
            label="Search"
            variant="outlined"
            density="compact"
            rounded="xl"
            hide-details
            @click:append-inner="bookSearch = ''"
          />
        </v-card>

        <!-- Book List -->
        <v-card class="pa-0" rounded="0" elevation="0" height="100%" style="overflow-y: auto">
          <div v-for="book in filteredBooks" :key="book.book" class="py-2">
            <!-- Book Row -->
            <v-btn
              block
              variant="text"
              class="justify-start px-6 text-none"
              height="50"
              @click="openBookChapters(book.book)"
            >
              <span class="text-h6">{{ book.book }}</span>
            </v-btn>

            <!-- Chapter Grid Under Selected Book -->
            <v-card
              v-if="currentBookName === book.book"
              class="px-4 pt-2"
              elevation="0"
              variant="plain"
              height="400"
              style="overflow-y: auto"
            >
              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  v-for="chapter in book.chapters"
                  :key="chapter.chapter"
                  width="64"
                  height="54"
                  rounded="lg"
                  :variant="chapter.chapter === currentChapter ? 'flat' : 'tonal'"
                  @click="selectChapter(chapter.chapter)"
                >
                  {{ chapter.chapter }}
                </v-btn>
              </div>
            </v-card>
          </div>
        </v-card>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.bible-text {
  line-height: 1.2;
  font-family: Arial, Serif;
}

.verse-clickable {
  cursor: pointer;
  border-radius: 6px;
  padding: 4px 6px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  transition:
    background-color 0.2s ease,
    text-decoration-color 0.2s ease,
    transform 0.2s ease;
}

.verse-clickable:active {
  transform: scale(0.99);
}

.verse-has-note {
  background-color: color-mix(in srgb, var(--verse-highlight-color) 28%, transparent);
  border-radius: 6px;
}

.verse-selected {
  text-decoration-line: underline;
  text-decoration-style: dashed;
  text-decoration-color: #2196f3;
  text-decoration-thickness: 2px;
  text-underline-offset: 5px;
}

.saved-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgb(var(--v-theme-background));
}

.saved-tabs {
  overflow-x: auto;
  scrollbar-width: none;
}

.saved-tabs::-webkit-scrollbar {
  display: none;
}

.saved-quote-line {
  width: 4px;
  flex: 0 0 4px;
  border-radius: 999px;
  background: rgb(var(--v-theme-on-surface));
}

.saved-verse-text {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.65;
}

.bookmark-color-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
}

.note-dialog-content {
  padding-bottom: 230px;
}

.note-bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgb(var(--v-theme-background));
  border-top: 1px solid rgba(var(--v-theme-on-background), 0.12);
}

.note-scroll-row {
  overflow-x: auto;
  scrollbar-width: none;
}

.note-scroll-row::-webkit-scrollbar {
  display: none;
}

.note-quote-line {
  width: 4px;
  flex: 0 0 4px;
  border-radius: 999px;
  background: rgb(var(--v-theme-on-background));
}

.note-verse-text {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.7;
}

.note-color-btn {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border: 0;
  border-radius: 999px;
}

.note-color-btn-active {
  outline: 3px solid rgb(var(--v-theme-on-background));
  outline-offset: 4px;
}
</style>
