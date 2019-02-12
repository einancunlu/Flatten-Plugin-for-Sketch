import * as os from 'os'
import * as fs from '@skpm/fs'

export default function withTempFolder(callback) {
  const tempDir = os.tmpdir()
  const path = fs.mkdtempSync(tempDir)
  callback(path)
  fs.rmdirSync(path)
}
