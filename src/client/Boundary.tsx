import * as React from 'react'
import type { T } from './locale.js'
import { styles } from './style.js'
export class Boundary extends React.Component<{t:T;children:React.ReactNode},{failed:boolean}> {
  override state = {failed:false}
  static getDerivedStateFromError(): {failed:boolean} {return {failed:true}}
  override render() {return this.state.failed ? <p role="alert" style={styles.error}>{this.props.t('requestFailed')}</p> : this.props.children}
}
