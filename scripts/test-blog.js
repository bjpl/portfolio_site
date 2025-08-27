const { db } = require('../lib/supabase/client.js');

async function testBlogFunctions() {
  console.log('🧪 Testing blog functions...\n');

  try {
    // Test fetching all blog posts
    console.log('1. Testing db.blogPosts.getAll()...');
    const posts = await db.blogPosts.getAll({ limit: 5 });
    console.log(`   ✅ Found ${posts.length} published posts`);
    
    if (posts.length > 0) {
      console.log(`   📄 First post: "${posts[0].title}"`);
      
      // Test fetching a specific post by slug
      console.log('\n2. Testing db.blogPosts.getBySlug()...');
      const specificPost = await db.blogPosts.getBySlug(posts[0].slug);
      console.log(`   ✅ Retrieved post: "${specificPost.title}"`);
      console.log(`   📝 Content length: ${specificPost.content?.length || 0} characters`);
      console.log(`   🏷️  Tags: ${specificPost.tags?.join(', ') || 'none'}`);
      console.log(`   👤 Author: ${specificPost.profiles?.full_name || specificPost.profiles?.username || 'Unknown'}`);
    } else {
      console.log('   ℹ️  No blog posts found. Blog components will show empty state.');
    }

    console.log('\n✅ Blog function tests completed successfully!');
  } catch (error) {
    console.error('❌ Error testing blog functions:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testBlogFunctions().then(() => {
    console.log('\n🎉 All blog tests passed!');
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 Blog tests failed:', error);
    process.exit(1);
  });
}

module.exports = { testBlogFunctions };