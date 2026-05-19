<template>
  <div class="min-h-screen flex flex-col">
    <!-- 导航栏 -->
    <nav class="sticky top-0 z-50 backdrop-blur-md border-b"
      :class="isDark ? 'bg-surface-dark/90 border-surface-dark-border' : 'bg-white/90 border-surface-light-border'">
      <div class="max-w-screen-2xl mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center gap-4 md:gap-8">
        <router-link to="/" class="font-roco text-xl md:text-2xl text-primary-500 tracking-wide flex-shrink-0">
          Roco Tools
        </router-link>

        <!-- 桌面端导航 -->
        <div class="hidden md:flex flex-1 items-center gap-2">
          <router-link to="/" class="nav-link" exact>首页</router-link>
          <router-link to="/pets" class="nav-link">精灵</router-link>
          <div class="relative" @mouseenter="skillMenuOpen = true" @mouseleave="skillMenuOpen = false">
            <button class="nav-link" :class="{ 'router-link-active': $route.path.startsWith('/skills') || $route.path === '/coverage' }">
              技能 <span class="text-xs opacity-60 ml-0.5">▼</span>
            </button>
            <div v-show="skillMenuOpen"
              class="absolute top-full left-0 pt-1">
              <div class="py-1 rounded-lg shadow-lg min-w-[140px] border"
                :class="isDark ? 'bg-surface-dark border-surface-dark-border' : 'bg-white border-surface-light-border'">
                <router-link to="/skills" class="dropdown-item" @click="skillMenuOpen = false">技能列表</router-link>
                <router-link to="/coverage" class="dropdown-item" @click="skillMenuOpen = false">打击面分析</router-link>
              </div>
            </div>
          </div>
          <router-link to="/eggs" class="nav-link">蛋组</router-link>
          <router-link to="/elements" class="nav-link">属性</router-link>
        </div>

        <!-- 右侧按钮组 -->
        <div class="flex items-center gap-1.5 md:gap-2 ml-auto">
          <!-- GitHub -->
          <a href="https://github.com/zycSelf/-RocoTools" target="_blank" rel="noopener noreferrer"
            class="btn-ghost w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full"
            title="GitHub 源码">
            <svg class="w-5 h-5 md:w-[22px] md:h-[22px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
          <!-- 主题切换 -->
          <button @click="toggle" class="btn-ghost w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full text-lg md:text-xl">
            <span v-if="isDark">☀️</span>
            <span v-else>🌙</span>
          </button>
          <!-- 汉堡菜单（仅移动端） -->
          <button @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden btn-ghost w-9 h-9 flex items-center justify-center rounded-full text-lg">
            <span v-if="mobileMenuOpen">✕</span>
            <span v-else>☰</span>
          </button>
        </div>
      </div>

      <!-- 移动端导航菜单 -->
      <div v-show="mobileMenuOpen" class="md:hidden border-t px-4 py-3 space-y-1"
        :class="isDark ? 'bg-surface-dark border-surface-dark-border' : 'bg-white border-surface-light-border'">
        <router-link to="/" class="mobile-nav-link" @click="mobileMenuOpen = false">首页</router-link>
        <router-link to="/pets" class="mobile-nav-link" @click="mobileMenuOpen = false">精灵</router-link>
        <router-link to="/skills" class="mobile-nav-link" @click="mobileMenuOpen = false">技能列表</router-link>
        <router-link to="/coverage" class="mobile-nav-link" @click="mobileMenuOpen = false">打击面分析</router-link>
        <router-link to="/eggs" class="mobile-nav-link" @click="mobileMenuOpen = false">蛋组</router-link>
        <router-link to="/elements" class="mobile-nav-link" @click="mobileMenuOpen = false">属性</router-link>
      </div>
    </nav>

    <!-- 内容区 -->
    <main class="flex-1 max-w-screen-2xl mx-auto w-full px-3 py-4 md:px-8 md:py-8">
      <router-view />
    </main>

    <!-- 底部 -->
    <footer class="text-center py-4 text-xs text-muted border-t"
      :class="isDark ? 'border-surface-dark-border' : 'border-surface-light-border'">
      数据来源：<a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer" class="hover:text-primary-500 underline underline-offset-2">洛克王国世界 BWIKI</a>
      · 内容遵循 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank" rel="noopener noreferrer" class="hover:text-primary-500 underline underline-offset-2">CC BY-NC-SA 4.0</a> 协议
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggle } = useTheme()
const skillMenuOpen = ref(false)
const mobileMenuOpen = ref(false)
</script>

<style lang="scss" scoped>
.nav-link {
  @apply px-4 py-2 rounded-lg text-base font-medium transition-colors;
  @apply text-gray-600 hover:text-gray-900 hover:bg-gray-100;

  .dark & {
    @apply text-gray-400 hover:text-white hover:bg-white/5;
  }

  &.router-link-active {
    @apply text-primary-600 bg-primary-50;
    .dark & {
      @apply text-primary-400 bg-primary-500/10;
    }
  }
}

.mobile-nav-link {
  @apply block px-4 py-2.5 rounded-lg text-base font-medium transition-colors;
  @apply text-gray-600 hover:text-gray-900 hover:bg-gray-100;

  .dark & {
    @apply text-gray-400 hover:text-white hover:bg-white/5;
  }

  &.router-link-active {
    @apply text-primary-600 bg-primary-50;
    .dark & {
      @apply text-primary-400 bg-primary-500/10;
    }
  }
}

.dropdown-item {
  @apply block px-4 py-2 text-sm transition-colors;
  @apply text-gray-600 hover:text-gray-900 hover:bg-gray-100;

  .dark & {
    @apply text-gray-400 hover:text-white hover:bg-white/5;
  }

  &.router-link-active {
    @apply text-primary-600 bg-primary-50;
    .dark & {
      @apply text-primary-400 bg-primary-500/10;
    }
  }
}
</style>
