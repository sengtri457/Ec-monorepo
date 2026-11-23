from rest_framework import serializers
from django.utils.text import slugify
from apps.catalog.models import Category, Product, ProductVariant, ProductImage

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'department', 'audience', 'description']

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'alt_text', 'is_primary', 'sort_order']

class ProductVariantSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(source='effective_price', max_digits=10, decimal_places=2)

    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'sku',
            'size',
            'color',
            'color_hex',
            'price',
            'stock',
            'is_default',
            'is_active',
        ]

class ProductListSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(source='base_price', max_digits=10, decimal_places=2)
    thumbnail = serializers.CharField(source='primary_image', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    total_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'slug',
            'title',
            'price',
            'thumbnail',
            'category_name',
            'department',
            'audience',
            'subcategory',
            'total_stock',
            'is_featured',
        ]

class ProductDetailSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(source='base_price', max_digits=10, decimal_places=2)
    thumbnail = serializers.CharField(source='primary_image', read_only=True)
    category = CategorySerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    total_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'price',
            'thumbnail',
            'category',
            'department',
            'audience',
            'subcategory',
            'fabric',
            'variants',
            'images',
            'total_stock',
            'is_featured',
        ]

class AdminProductVariantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    price_override = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'sku',
            'size',
            'color',
            'color_hex',
            'price_override',
            'stock',
            'is_default',
            'is_active',
        ]

class AdminProductSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    variants = AdminProductVariantSerializer(many=True, required=False)
    images = ProductImageSerializer(many=True, required=False)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True
    )
    category = CategorySerializer(read_only=True)
    thumbnail = serializers.CharField(source='primary_image', read_only=True)
    total_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'slug',
            'title',
            'description',
            'base_price',
            'category_id',
            'category',
            'department',
            'audience',
            'subcategory',
            'fabric',
            'thumbnail',
            'total_stock',
            'is_active',
            'is_featured',
            'variants',
            'images',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        variants_data = validated_data.pop('variants', [])
        images_data = validated_data.pop('images', [])

        if not validated_data.get('slug'):
            base_slug = slugify(validated_data['title'])
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug

        product = Product.objects.create(**validated_data)

        for v_data in variants_data:
            ProductVariant.objects.create(product=product, **v_data)

        for idx, img_data in enumerate(images_data):
            ProductImage.objects.create(
                product=product,
                image_url=img_data.get('image_url', ''),
                alt_text=img_data.get('alt_text', product.title),
                is_primary=img_data.get('is_primary', idx == 0),
                sort_order=img_data.get('sort_order', idx)
            )

        return product

    def update(self, instance, validated_data):
        variants_data = validated_data.pop('variants', None)
        images_data = validated_data.pop('images', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if variants_data is not None:
            seen_ids = set()
            for v_data in variants_data:
                v_id = v_data.pop('id', None)
                if v_id and ProductVariant.objects.filter(id=v_id, product=instance).exists():
                    v_obj = ProductVariant.objects.get(id=v_id, product=instance)
                    for k, val in v_data.items():
                        setattr(v_obj, k, val)
                    v_obj.save()
                    seen_ids.add(v_obj.id)
                else:
                    new_v = ProductVariant.objects.create(product=instance, **v_data)
                    seen_ids.add(new_v.id)

        if images_data is not None:
            instance.images.all().delete()
            for idx, img_data in enumerate(images_data):
                ProductImage.objects.create(
                    product=instance,
                    image_url=img_data.get('image_url', ''),
                    alt_text=img_data.get('alt_text', instance.title),
                    is_primary=img_data.get('is_primary', idx == 0),
                    sort_order=img_data.get('sort_order', idx)
                )

        return instance
