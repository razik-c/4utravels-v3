// /api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSignedUrlForUpload } from '@/lib/r2'

function cleanSegment(s: string) {
  return String(s || '')
    .replaceAll('\\', '/')
    .replaceAll('..', '')
    .replace(/^[\/]+|[\/]+$/g, '')        // trim outer slashes
    .replace(/[^\w\-./]/g, '_')           // keep slashes
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const rawFileName = body.fileName
  const rawFileType = body.fileType
  const rawDir      = body.dir
  const rawRelPath  = body.relativePath

  if (!rawFileName || typeof rawFileName !== 'string')
    return NextResponse.json({ error: 'fileName is required' }, { status: 400 })
  if (!rawFileType || typeof rawFileType !== 'string')
    return NextResponse.json({ error: 'fileType is required' }, { status: 400 })

  const fileName = cleanSegment(rawFileName)
  const fileType = cleanSegment(rawFileType)
  const dir      = cleanSegment(rawDir || '')
  const relPath  = cleanSegment(rawRelPath || '')

  // Key priority: relativePath (already includes filename) → dir/filename → filename
  const key = relPath
    ? relPath
    : (dir ? `${dir}/${fileName}` : fileName)

  // match your helper signature
  const signedUrl = await getSignedUrlForUpload(key, fileType)
  return NextResponse.json({ signedUrl, key })
}
