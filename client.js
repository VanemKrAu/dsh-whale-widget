/**
 * dsh-whale-widget — 客户端入口（浏览器端）
 *
 * 为什么需要这个文件：
 * 插件原本只用 host 端的 `ctx.webServer.tapIndex(...)` 往首页 HTML 里注入
 * <script src="/dsh-whale/widget.js">。但 0.2.0 的 webServer 文档写明，
 * tapIndex 的 transform 只由 **fallback owner** 在渲染首页时调用：
 *
 *   "Register a raw-HTML index transform … — called by the fallback owner
 *    on every index response it renders."
 *
 * 在 desktop profile 下，首页由静态前端宿主直接提供，不经过 fallback owner，
 * 因此 tap 永不执行 —— 表现就是 HTML 里没有该 script 标签（tag: null），
 * 挂件静默不出现；而手动在控制台 document.body.appendChild 一个同样的
 * 动态脚本却能正常显示。
 *
 * 所以这里以标准的 DSH 客户端插件身份加载（package.json 的 dsh.client +
 * exports["./client"]），在前端就绪后自己插一个动态脚本 —— 与手动注入等价。
 *
 * ⚠️ 加载格式：DSH 的客户端插件**不是 ESM 模块**，而是交给
 * `window.__ModuleLoader__` 的工厂函数（与 dsh-approval-gate/client.js 同款）。
 * 若写成 `export const inject = []` 这类 ESM 语法，DSH 会按普通脚本解析，
 * 在第一个 export 处抛 `Unexpected token 'export'`；更糟的是该文件被并进
 * plugins 聚合包（dsh-app://app/plugins/??…），解析失败会连累**所有**客户端
 * 插件一起不加载。因此必须保持下面的 `window.__ModuleLoader__.load({...})` 形式。
 */

window.__ModuleLoader__.load({
  id: 'dsh-whale-widget',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    /** 已注入标记，避免重复插入。 */
    const MARK = '__dshWhaleWidgetInjected'

    /**
     * 把挂件脚本插入页面。
     * 脚本自身带 window.__dshWhaleWidget 守卫，重复加载也不会重复渲染。
     */
    function injectWidget() {
      if (typeof document === 'undefined') return
      if (globalThis[MARK]) return
      globalThis[MARK] = true

      const existing = document.querySelector('script[src*="/dsh-whale/widget.js"]')
      if (existing) return

      const script = document.createElement('script')
      script.src = '/dsh-whale/widget.js'
      script.async = true
      script.dataset.dshWhaleWidget = '1'

      const append = () => {
        const parent = document.body || document.head || document.documentElement
        if (parent) parent.appendChild(script)
      }

      if (document.body) append()
      else document.addEventListener('DOMContentLoaded', append, { once: true })
    }

    /**
     * DSH 客户端插件对象。
     * 无论 ctx 提供什么，这里的副作用都只是插入一个脚本，因此直接执行即可。
     */
    const plugin = {
      name: 'dsh-whale-widget',
      inject: [],
      apply: injectWidget,
    }

    exports.default = plugin
    exports.apply = plugin.apply
    exports.inject = plugin.inject
    return module.exports
  },
})
