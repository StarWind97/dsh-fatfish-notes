/** Approved berry palette. These roles do not recolor the application's UI theme. */
export const brandPalette={
  light:{body:'#A337A0',arc:'#529849',text:'#492340',background:'#F9EDF6'},
  dark:{body:'#BA3FB6',arc:'#5DAC53',text:'#FFF7EE',background:'#2B1927'},
  tile:{body:'#FFF7EE',arc:'#B5EDA2',background:'#A337A0'},
} as const
export function brandStyle(dark:boolean){
  const colors=brandPalette[dark?'dark':'light']
  return {'--fatfish-brand-body':colors.body,'--fatfish-brand-arc':colors.arc,'--fatfish-brand-text':colors.text}
}
