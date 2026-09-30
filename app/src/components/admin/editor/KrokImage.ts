import Image from '@tiptap/extension-image'

export type ImageAlign = 'none' | 'left' | 'right' | 'center'

/**
 * Obrázok v editore s uloženým zarovnaním a šírkou.
 * Štandardné rozšírenie Image tieto atribúty nemá v schéme, takže sa pri uložení strácali.
 *  - align: left / right = obtekanie textom (logo s textom vedľa), center = na stred
 *  - width: '150px', '50%'… (uloží sa ako inline štýl – funguje aj na verejnej stránke)
 * Odkaz na obrázku = bežný odkaz (Link mark) – obrázok je inline, dá sa naň použiť tlačidlo Odkaz.
 */
export const KrokImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'none',
        parseHTML: (el: HTMLElement) => {
          const a = el.getAttribute('data-align')
          if (a === 'left' || a === 'right' || a === 'center') return a
          // staršie obrázky vložené s triedou float-left / float-right
          if (el.classList.contains('float-left')) return 'left'
          if (el.classList.contains('float-right')) return 'right'
          return 'none'
        },
        renderHTML: (attrs: { align?: ImageAlign }) =>
          attrs.align && attrs.align !== 'none'
            ? { 'data-align': attrs.align, class: `editor-image img-align-${attrs.align}` }
            : { class: 'editor-image' },
      },
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const style = el.style?.width
          if (style) return style
          const w = el.getAttribute('width')
          return w ? (/^\d+$/.test(w) ? `${w}px` : w) : null
        },
        renderHTML: (attrs: { width?: string | null }) => (attrs.width ? { style: `width: ${attrs.width}` } : {}),
      },
      // výška sa neukladá – pomer strán ostáva zachovaný
      height: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
    }
  },
})
