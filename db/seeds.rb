# Clear existing data
User.destroy_all
Post.destroy_all
Chapter.destroy_all

# Create a user
user = User.create!(
  email: "quentin.orhant@gmook.com",
  password: "azerty",
  username: "Quentin Orhant"
)

# Bypass Devise email confirmation
user.update!(confirmed_at: Time.current)

# Create posts with chapters
posts = [
  {
    title: "Tout a changé : Capitalisme et changement climatique",
    unsplash_image_url: "https://images.unsplash.com/photo-1534081333815-ae5019106622?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHwxfHx2b3lhZ2V8ZW58MHx8fHwxNzIwNjE2NzAw&ixlib=rb-4.0.3&q=85",
    image_rights: false,
    color: "hsl(141, 100%, 50%)"
  },
  {
    title: "Pacte d'impact",
    unsplash_image_url: "https://images.unsplash.com/photo-1551225183-94acb7d595b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHw5fHx0ZXh0fGVufDB8fHx8MTcyMDYwMTE3OHww&ixlib=rb-4.0.3&q=85",
    image_rights: false,
    color: "hsl(204, 100%, 50%)"
  },
  {
    title: "Equilibre instable",
    unsplash_image_url: "https://images.unsplash.com/photo-1494211903311-37d2d4d8e8c4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHwxfHxpbWFnZXxlbnwwfHx8fDE3MjA2MTY2MzJ8&ixlib=rb-4.0.3&q=85",
    image_rights: false,
    color: "hsl(313, 100%, 50%)"
  },
  {
    title: "Les nomades du futur",
    unsplash_image_url: "https://images.unsplash.com/photo-1529101091764-c3526daf38fe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHwxfHx0cmF2ZWx8ZW58MHx8fHwxNzIwNjE2NjU0&ixlib=rb-4.0.3&q=85",
    image_rights: false,
    color: "hsl(118, 100%, 50%)"
  }
]

posts.each do |post_data|
  post = Post.create!(
    title: post_data[:title],
    user_id: user.id,
    unsplash_image_url: post_data[:unsplash_image_url],
    image_rights: post_data[:image_rights],
    color: post_data[:color],
    body: Faker::Lorem.paragraphs(number: 5).join("\n\n")  # Adding a random body using Faker
  )

  # Optionally, create chapters for each post
  Chapter.create!([
    { title: "Introduction", body: "This is the introduction for #{post.title}.", post_id: post.id, position: 1 },
    { title: "Conclusion", body: "This is the conclusion for #{post.title}.", post_id: post.id, position: 2 }
  ])
end

# Generate 20 more stories with multiple chapters and content using Faker
20.times do
  post = Post.create!(
    title: Faker::Book.title,
    user_id: user.id,
    unsplash_image_url: Faker::LoremFlickr.image(size: "300x300", search_terms: ['future', 'technology']),
    image_rights: false,
    color: "hsl(#{rand(360)}, 100%, 50%)",
    body: Faker::Lorem.paragraphs(number: 5).join("\n\n")  # Adding a random body using Faker
  )

  # Generate 5-10 chapters for each post
  chapter_count = rand(5..10)
  chapter_count.times do |i|
    Chapter.create!(
      title: Faker::Lorem.sentence(word_count: 3, supplemental: true, random_words_to_add: 2),
      body: Faker::Lorem.paragraphs(number: rand(3..6)).join("\n\n"),
      post_id: post.id,
      position: i + 1
    )
  end
end
