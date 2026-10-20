import { readFile } from 'fs/promises'
import { join } from 'path'

export default async function HomePage() {
  const html = await readFile(join(process.cwd(), 'public', 'index.html'), 'utf8')
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
