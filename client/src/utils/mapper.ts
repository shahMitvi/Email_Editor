import type { BuilderState } from "../store/useBuilderStore";

export const mapStateToDBPayload = (state: BuilderState, templateName: string) =>{
    const activePage = state.pages.find(p => p.id === state.currentPageId) || state.pages[0];
    return {
        name : templateName,
        type: "email_template",
        page_size: state.canvasSettings.width + 'x' + state.canvasSettings.height,
        variable: state.variables.map(v => ({
            id: v.id,
            name: v.name,
            fallback: v.fallback
        })),
        globalSettings: {
            backgroundColor: state.canvasSettings.backgroundColor,
            fontFamily: "Arial, Helvetica, sans-serif"
        },

        contentJSON: {
            canvasSettings: state.canvasSettings
        },
        layers: activePage.elements.map(el => {
            const {left,top,zIndex,...otherStyles} = el.styles;

            return {
                id: el.id,
                type: el.type,
                pos:{
                    x: parseFloat(left as string) || 0,
                    y: parseFloat(top as string) || 0,
                    z: zIndex ? parseInt(zIndex as string) : 1
                },
                props: {
                    ...otherStyles,
                    ...el.content
                }
            }
        })
    }
}