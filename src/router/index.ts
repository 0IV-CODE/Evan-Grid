import { createRouter, createWebHistory } from 'vue-router'

const MapView = () => import('../views/MapView.vue')
const BooksView = () => import('../views/BooksView.vue')
const LyricsView = () => import('../views/LyricsView.vue')
const JournalView = () => import('../views/JournalView.vue')
const UserSettings = () => import('../views/UserSettings.vue')
const NetworkList = () => import('../views/NetworkList.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'MapView',
      component: MapView,
      meta: {},
    },
    {
      path: '/books',
      name: 'BooksView',
      component: BooksView,
      meta: {},
    },
    {
      path: '/lyrics',
      name: 'LyricsView',
      component: LyricsView,
      meta: {},
    },
    {
      path: '/journal',
      name: 'JournalView',
      component: JournalView,
      meta: {},
    },
    {
      path: '/settings',
      name: 'UserSettings',
      component: UserSettings,
      meta: {},
    },
    {
      path: '/network',
      name: 'NetworkList',
      component: NetworkList,
      meta: {},
    },
  ],
})

export default router
