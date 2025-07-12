# React Static Render with Multi-Engine Template Support

## Usage Examples

### 1. Using Liquid Template Components

```tsx
// entry-points/product.tsx
import React from 'react';
import { LiquidIf, LiquidFor, LiquidObject, LiquidComment } from 'react-static-render/components';

export default {
  node: (
    <div className="product-page">
      <LiquidComment>Product page template</LiquidComment>
      
      <h1><LiquidObject>product.title</LiquidObject></h1>
      
      <LiquidIf condition="product.available">
        <div className="product-available">
          <p>Price: <LiquidObject>product.price | money</LiquidObject></p>
          <button>Add to Cart</button>
        </div>
      </LiquidIf>
      
      <div className="product-variants">
        <LiquidFor item="variant" collection="product.variants">
          <div className="variant">
            <h3><LiquidObject>variant.title</LiquidObject></h3>
            <p><LiquidObject>variant.price | money</LiquidObject></p>
          </div>
        </LiquidFor>
      </div>
    </div>
  ),
  rootElementId: 'product-root'
};
```

### 2. Using PHP Template Components

```tsx
// entry-points/user-list.tsx
import React from 'react';
import { PhpIf, PhpForeach, PhpEcho } from 'react-static-render/components';

export default {
  node: (
    <div className="user-list">
      <h1>User Directory</h1>
      <PhpIf condition="!empty($users)">
        <div className="user-grid">
          <PhpForeach array="$users" variable="$user">
            <div className="user-card">
              <h3><PhpEcho value="$user['name']" escape={true} /></h3>
              <p><PhpEcho value="$user['email']" escape={true} /></p>
              <p>Role: <PhpEcho value="$user['role']" /></p>
            </div>
          </PhpForeach>
        </div>
      </PhpIf>
      
      <PhpIf condition="empty($users)">
        <p>No users found.</p>
      </PhpIf>
    </div>
  ),
  rootElementId: 'user-list-root'
};
```

### 3. Configuration for Multiple Template Engines

```json
{
  "entryPointsBase": "src/entry-points",
  "srcBase": "src", 
  "outputDir": "dist",
  "templateDir": "templates",
  "templateEngine": "auto",
  "templateEngines": {
    "liquid": {
      "fileExtensions": [".liquid", ".html"],
      "variableDelimiters": ["{{", "}}"],
      "tagDelimiters": ["{%", "%}"]
    },
    "php": {
      "fileExtensions": [".php"],
      "shortTags": false
    }
  },
  "fileExtensions": ["js", "jsx", "ts", "tsx"]
}
```

### 4. Template Files

#### Liquid Template (templates/product.liquid)
```liquid
<!DOCTYPE html>
<html>
<head>
  <title>{{ product.title }}</title>
</head>
<body>
  <div id="product-root"></div>
  
  <script>
    window.productData = {{ product | json }};
  </script>
</body>
</html>
```

#### PHP Template (templates/user-list.php)
```php
<!DOCTYPE html>
<html>
<head>
  <title><?php echo $page_title; ?></title>
</head>
<body>
  <header>
    <?php include 'header.php'; ?>
  </header>
  
  <main>
    <div id="user-list-root"></div>
  </main>
  
  <footer>
    <?php include 'footer.php'; ?>
  </footer>
</body>
</html>
```

## CLI Usage

```bash
# Render with automatic engine detection
react-static-render

# Render specific files
react-static-render product.tsx user-list.tsx

# Watch mode with live reload for templates
react-static-render --watch --live-reload

# Use specific configuration file
react-static-render --config custom.config.json
```

## Import Paths

```tsx
// Import template components
import { 
  LiquidIf, 
  LiquidFor, 
  LiquidObject 
} from 'react-static-render/components/liquid';

import { 
  PhpIf, 
  PhpForeach, 
  PhpEcho 
} from 'react-static-render/components/php';

// Import template engines (for advanced usage)
import { 
  LiquidTemplateEngine, 
  PHPTemplateEngine 
} from 'react-static-render/engines';
```

## Advanced PHP Examples

### Using PHP Control Flow

```tsx
// entry-points/blog-posts.tsx
import React from 'react';
import { PhpIf, PhpForeach, PhpEcho, PhpElse } from 'react-static-render/components';

export default {
  node: (
    <div className="blog-posts">
      <h1>Latest Blog Posts</h1>
      
      <PhpIf condition="count($posts) > 0">
        <div className="posts-grid">
          <PhpForeach array="$posts" variable="$post">
            <article className="post-card">
              <h2><PhpEcho value="$post['title']" escape={true} /></h2>
              <p className="meta">
                Published: <PhpEcho value="date('Y-m-d', strtotime($post['created_at']))" />
              </p>
              <div className="excerpt">
                <PhpEcho value="substr($post['content'], 0, 200)" escape={true} />...
              </div>
              <a href={`/posts/<?php echo $post['slug']; ?>`}>Read More</a>
            </article>
          </PhpForeach>
        </div>
      </PhpIf>
      
      <PhpElse>
        <p>No posts available at the moment.</p>
      </PhpElse>
    </div>
  ),
  rootElementId: 'blog-posts'
};
```

### Using Template Literals

```tsx
// entry-points/dashboard.tsx
import React from 'react';
import { php } from 'react-static-render/components';

export default {
  node: (
    <div className="dashboard">
      <h1>User Dashboard</h1>
      
      {php`
        if ($user['is_admin']) {
          echo '<div class="admin-panel">';
          echo '<h2>Admin Controls</h2>';
          echo '<button>Manage Users</button>';
          echo '</div>';
        }
      `}
      
      <div className="user-info">
        {php`
          echo '<p>Welcome, ' . htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8') . '</p>';
          echo '<p>Last login: ' . date('Y-m-d H:i', strtotime($user['last_login'])) . '</p>';
        `}
      </div>
    </div>
  ),
  rootElementId: 'dashboard'
};
```