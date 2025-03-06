
type TProps = {
  bytes: string
}

// TODO: #task add localization support

export default function FileSizePresenter(props: TProps) {
  const { bytes } = props
  const byteValue = parseInt(bytes, 10)
  const styles = 'text-left font-normal py-0.5'
  if (byteValue > 1048576){
    return <div className={styles}>{Math.round(byteValue / (1024 * 1024))} МБ</div>
  } else {
    return <div className={styles}>{Math.round(byteValue / 1024)} КБ</div>
  }
}
