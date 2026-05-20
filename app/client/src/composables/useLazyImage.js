import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 图片懒加载指令
 * 只有进入视窗附近（rootMargin）才开始加载
 */
export function useLazyImage() {
  const observer = ref(null)

  onMounted(() => {
    observer.value = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const img = entry.target
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.removeAttribute('data-src')
            }
            observer.value.unobserve(img)
          }
        }
      },
      { rootMargin: '200px 0px' } // 提前 200px 开始加载
    )
  })

  onBeforeUnmount(() => {
    if (observer.value) observer.value.disconnect()
  })

  function observe(el) {
    if (observer.value && el) {
      observer.value.observe(el)
    }
  }

  return { observe }
}

/**
 * Vue 自定义指令 v-lazy-src
 * 用法：<img v-lazy-src="imageUrl" />
 */
export const vLazySrc = {
  mounted(el, binding) {
    // 占位透明像素
    el.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    el.dataset.src = binding.value

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.src = el.dataset.src
            el.removeAttribute('data-src')
            observer.unobserve(el)
          }
        }
      },
      { rootMargin: '200px 0px' }
    )
    observer.observe(el)
    el._lazyObserver = observer
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      // URL 变了（翻页了），重新设置
      if (el._lazyObserver) el._lazyObserver.unobserve(el)
      el.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      el.dataset.src = binding.value

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              el.src = el.dataset.src
              el.removeAttribute('data-src')
              observer.unobserve(el)
            }
          }
        },
        { rootMargin: '200px 0px' }
      )
      observer.observe(el)
      el._lazyObserver = observer
    }
  },
  beforeUnmount(el) {
    if (el._lazyObserver) {
      el._lazyObserver.disconnect()
      delete el._lazyObserver
    }
  },
}
