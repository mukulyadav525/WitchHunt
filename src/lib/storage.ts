import { supabase } from './supabase'

/**
 * Uploads a file to a Supabase bucket with path partitioning
 */
export async function uploadRoadImage(
    file: File,
    bucket: 'road-images' | 'defect-photos' | 'complaint-photos'
): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Only image files allowed')
    if (file.size > 10 * 1024 * 1024) throw new Error('Image must be under 10MB')

    // Compression logic (simplified browser-side)
    const processedFile = file.size > 2 * 1024 * 1024
        ? await compressImage(file, 0.8)
        : file

    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`
    const path = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`

    const { error } = await supabase.storage
        .from(bucket)
        .upload(path, processedFile, {
            contentType: processedFile.type,
            upsert: false
        })

    if (error) throw new Error(`Upload failed: ${error.message}`)

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

    return publicUrl
}

export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

async function compressImage(file: File, quality: number): Promise<File> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas')
        const img = new Image()
        img.onload = () => {
            const maxW = 1920
            const scale = img.width > maxW ? maxW / img.width : 1
            canvas.width = img.width * scale
            canvas.height = img.height * scale
            const ctx = canvas.getContext('2d')
            if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(
                (blob) => resolve(new File([blob!], file.name, { type: 'image/jpeg' })),
                'image/jpeg',
                quality
            )
        }
        img.src = URL.createObjectURL(file)
    })
}
