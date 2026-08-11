import Swal from 'sweetalert2'

interface ConfirmDeleteOptions {
  title?: string
  text?: string
  confirmButtonText?: string
  onConfirm: () => Promise<any>
}

/**
 * Standard confirmation dialog for deleting items with built-in loader
 */
export const confirmDelete = async (options: ConfirmDeleteOptions) => {
  return Swal.fire({
    title: options.title || 'Hapus Data?',
    text: options.text || 'Data ini akan dihapus secara permanen dan tidak dapat dikembalikan.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'Ya, Hapus!',
    cancelButtonText: 'Batal',
    showLoaderOnConfirm: true,
    preConfirm: async () => {
      try {
        await options.onConfirm()
        return true
      } catch (err: any) {
        Swal.showValidationMessage(err.message || 'Gagal menghapus data')
        return false
      }
    },
    allowOutsideClick: () => !Swal.isLoading()
  })
}
