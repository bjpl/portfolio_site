const express = require('express');
const { BlogCategory, Blog } = require('../../models');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { Op } = require('sequelize');
const slugify = require('slugify');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { includeStats = false } = req.query;

    const options = {
      where: { isActive: true },
      order: [['name', 'ASC']]
    };

    if (includeStats === 'true') {
      options.include = [
        {
          model: Blog,
          as: 'blogs',
          where: { status: 'published' },
          required: false,
          attributes: []
        }
      ];
      options.attributes = [
        'id', 'name', 'slug', 'description', 'color',
        [sequelize.fn('COUNT', sequelize.col('blogs.id')), 'blogCount']
      ];
      options.group = ['BlogCategory.id'];
    }

    const categories = await BlogCategory.findAll(options);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single category
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const category = await BlogCategory.findOne({
      where: { slug, isActive: true },
      include: [
        {
          model: Blog,
          as: 'blogs',
          where: { status: 'published' },
          required: false,
          limit: 10,
          order: [['publishedAt', 'DESC']],
          attributes: ['id', 'title', 'slug', 'excerpt', 'publishedAt']
        }
      ]
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create category (admin only)
router.post('/', 
  authenticateToken, 
  requireRole('admin'), 
  async (req, res) => {
    try {
      const { name, description, color = '#007bff' } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const slug = slugify(name, { lower: true, strict: true });

      // Check if category already exists
      const existing = await BlogCategory.findOne({ where: { slug } });
      if (existing) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }

      const category = await BlogCategory.create({
        name,
        slug,
        description,
        color
      });

      res.status(201).json(category);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
);

// Update category (admin only)
router.put('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, color, isActive } = req.body;

      const category = await BlogCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const updateData = {};
      
      if (name && name !== category.name) {
        const slug = slugify(name, { lower: true, strict: true });
        
        // Check slug uniqueness
        const existing = await BlogCategory.findOne({ 
          where: { slug, id: { [Op.ne]: id } } 
        });
        if (existing) {
          return res.status(400).json({ error: 'Category with this name already exists' });
        }
        
        updateData.name = name;
        updateData.slug = slug;
      }

      if (description !== undefined) updateData.description = description;
      if (color !== undefined) updateData.color = color;
      if (isActive !== undefined) updateData.isActive = isActive;

      await category.update(updateData);
      res.json(category);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  }
);

// Delete category (admin only)
router.delete('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  async (req, res) => {
    try {
      const { id } = req.params;

      const category = await BlogCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if category is used by any blogs
      const blogCount = await Blog.count({
        include: [
          {
            model: BlogCategory,
            as: 'categories',
            where: { id }
          }
        ]
      });

      if (blogCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete category. It is used by ${blogCount} blog(s).` 
        });
      }

      await category.destroy();
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  }
);

module.exports = router;