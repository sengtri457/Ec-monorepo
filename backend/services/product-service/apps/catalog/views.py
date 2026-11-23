from django.db.models import Q
from rest_framework import viewsets, generics
from rest_framework.response import Response
from apps.catalog.models import Category, Product
from apps.catalog.serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    AdminProductSerializer,
)
from apps.core.admin_permissions import IsAdminOrStaffUser

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    pagination_class = None

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = 'slug'

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related('category').prefetch_related('variants', 'images')

        dept = self.request.query_params.get('department')
        if dept and dept != 'all':
            qs = qs.filter(department=dept)

        audience = self.request.query_params.get('audience')
        if audience and audience != 'all':
            qs = qs.filter(audience=audience)

        category_slug = self.request.query_params.get('category')
        if category_slug and category_slug != 'all':
            qs = qs.filter(Q(category__slug=category_slug) | Q(category__parent__slug=category_slug))

        subcat = self.request.query_params.get('subcategory')
        if subcat and subcat != 'all':
            qs = qs.filter(subcategory=subcat)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search) | Q(fabric__icontains=search))

        sort = self.request.query_params.get('sort')
        if sort == 'price_asc':
            qs = qs.order_by('base_price')
        elif sort == 'price_desc':
            qs = qs.order_by('-base_price')
        elif sort == 'newest':
            qs = qs.order_by('-created_at')

        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def get_object(self):
        lookup_value = self.kwargs[self.lookup_field]
        queryset = self.get_queryset()
        if lookup_value.isdigit():
            obj = queryset.filter(id=int(lookup_value)).first()
            if obj:
                return obj
        return queryset.filter(slug=lookup_value).first() or super().get_object()

class AdminProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrStaffUser]
    serializer_class = AdminProductSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = Product.objects.all().select_related('category').prefetch_related('variants', 'images').order_by('-created_at')

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search) | Q(slug__icontains=search))

        category = self.request.query_params.get('category')
        if category and category != 'all':
            qs = qs.filter(category__slug=category)

        department = self.request.query_params.get('department')
        if department and department != 'all':
            qs = qs.filter(department=department)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None and is_active != '':
            qs = qs.filter(is_active=(is_active.lower() in ('true', '1')))

        return qs
