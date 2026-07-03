'use client'
import React, { useMemo } from 'react'
import { RenderFields, Drawer, useModal } from '@payloadcms/ui'
import { ChevronRight, Save } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DrawerField: React.FC<any> = (props) => {
  const { field, fields: propsFields, path } = props
  // For group/collapsible fields, sub-fields are in 'field.fields'
  const fields = field?.fields || propsFields

  // Handle case where label might be an object (i18n)
  const labelText =
    typeof field?.label === 'object'
      ? field.label.en || Object.values(field.label)[0]
      : field?.label || 'Section'
  const label = typeof labelText === 'string' ? labelText : 'Section'

  const { closeModal, isModalOpen, toggleModal } = useModal()
  const drawerSlug = useMemo(
    () => `drawer-field-${path?.replace(/\./g, '-') || Math.random().toString(36).substring(7)}`,
    [path],
  )

  console.log('DrawerField debugging:', {
    label,
    path,
    fieldsLength: fields?.length,
    fieldType: field?.type,
    drawerSlug,
  })

  return (
    <div className="my-8">
      <button
        type="button"
        onClick={() => toggleModal(drawerSlug)}
        className="w-full text-left border border-(--theme-elevation-200) rounded-2xl overflow-hidden shadow-sm bg-(--theme-elevation-50)/30 transition-all hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 group/card flex items-center justify-between p-1 focus:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-5 p-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-(--theme-elevation-150) flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner border border-(--theme-elevation-200) group-hover/card:border-primary/50 group-hover/card:bg-primary/5">
            {label.includes('🎯')
              ? '🎯'
              : label.includes('📚')
                ? '📚'
                : label.includes('💡')
                  ? '💡'
                  : '📁'}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-xl tracking-tight text-(--theme-elevation-850) group-hover/card:text-primary transition-colors">
              {label.replace(/^[^\w\s]*\s*/, '')}
            </span>
            <span className="text-[10px] text-(--theme-elevation-400) font-bold uppercase tracking-[0.2em]">
              Manage Section Data
            </span>
          </div>
        </div>
        <div className="pr-6 text-(--theme-elevation-300) group-hover/card:text-primary transition-colors">
          <ChevronRight className="w-6 h-6" />
        </div>
      </button>

      {isModalOpen(drawerSlug) && (
        <Drawer
          slug={drawerSlug}
          title={label.replace(/^[^\w\s]*\s*/, '')}
          className="drawer-field-modal"
        >
          <style>{`
            .drawer-field-modal .drawer__content {
              max-width: 800px !important; /* Make it less wide */
              width: 90vw !important;
            }
            .drawer-field-container {
              display: flex;
              flex-direction: column;
            }
            .drawer-field-scrollable {
              flex: 1;
              padding-bottom: 1rem;
            }
            .drawer-field-footer {
              padding: 1rem 1.5rem;
              margin-top: 1rem; /* Add some space above the button */
            }
          `}</style>

          <div className="drawer-field-container">
            {/* <div className="drawer-field-scrollable"> */}
            <div className="px-0 py-0 space-y-0">
              <div>
                <RenderFields {...props} fields={fields} forceRender readOnly={false} />
              </div>
            </div>

            <div className="drawer-field-footer">
              <button
                type="button"
                onClick={() => closeModal(drawerSlug)}
                className="w-full bg-primary text-white font-bold text-center py-4 rounded-xl shadow-lg border border-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Apply & Close
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}

export default DrawerField
