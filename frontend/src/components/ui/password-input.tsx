import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface PasswordInputProps extends React.ComponentProps<"input"> {
  containerClassName?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, containerClassName, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    return (
      <div className={cn("relative w-full", containerClassName)}>
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
          ref={ref}
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
          title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          ) : (
            <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          )}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
