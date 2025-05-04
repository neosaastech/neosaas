#!/bin/bash

echo "🚀 Correction des imports vers la nouvelle architecture..."

find ./app ./components -type f -name "*.tsx" -exec sed -i \
-e 's|from "@/components/common/brand-icon"|from "@/components/brand-icon"|g' \
-e 's|from "@/components/ui/button"|from "@/components/ui/form-elements/button"|g' \
-e 's|from "@/components/ui/input"|from "@/components/ui/form-elements/input"|g' \
-e 's|from "@/components/ui/label"|from "@/components/ui/form-elements/label"|g' \
-e 's|from "@/components/ui/checkbox"|from "@/components/ui/form-elements/checkbox"|g' \
-e 's|from "@/components/ui/separator"|from "@/components/ui/layout/separator"|g' \
-e 's|from "@/components/ui/sheet"|from "@/components/ui/layout/sheet"|g' \
-e 's|from "@/components/ui/scroll-area"|from "@/components/ui/layout/scroll-area"|g' \
-e 's|from "@/components/ui/table"|from "@/components/ui/layout/table"|g' \
-e 's|from "@/components/ui/card"|from "@/components/ui/layout/card"|g' \
-e 's|from "@/components/ui/dialog"|from "@/components/ui/layout/dialog"|g' \
-e 's|from "@/components/ui/badge"|from "@/components/ui/badge"|g' \
-e 's|from "@/components/ui/tabs"|from "@/components/ui/navigation/tabs"|g' \
-e 's|from "@/components/ui/dropdown-menu"|from "@/components/ui/navigation/dropdown-menu"|g' \
-e 's|from "@/components/ui/navigation-menu"|from "@/components/ui/navigation/navigation-menu"|g' \
-e 's|from "@/components/ui/progress"|from "@/components/ui/feedback/progress"|g' \
-e 's|from "@/components/ui/skeleton"|from "@/components/ui/feedback/skeleton"|g' \
-e 's|from "@/components/ui/alert"|from "@/components/ui/feedback/alerts/alert"|g' \
-e 's|from "@/components/ui/toast"|from "@/components/ui/feedback/toasts/toast"|g' \
{} +

echo "✅ Correction des imports terminée."
