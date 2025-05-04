find ./app ./components -type f -name "*.tsx" -exec sed -i \
-e 's|from "@/components/ui/avatar"|from "@/components/user/avatar"|g' \
-e 's|from "@/components/ui/alert"|from "@/components/ui/feedback/alerts/alert"|g' \
-e 's|from "@/components/ui/toast"|from "@/components/ui/feedback/toasts/toast"|g' \
-e 's|from "@/components/ui/use-toast"|from "@/components/ui/feedback/toasts/use-toast"|g' \
-e 's|from "@/components/ui/dialog"|from "@/components/ui/layout/dialog"|g' \
-e 's|from "@/components/ui/scroll-area"|from "@/components/ui/layout/scroll-area"|g' \
-e 's|from "@/components/ui/chart"|from "@/components/ui/charts/chart"|g' \
-e 's|from "@/components/ui/table"|from "@/components/ui/layout/table"|g' \
-e 's|from "@/components/ui/skeleton"|from "@/components/ui/feedback/skeleton"|g' \
{} +
