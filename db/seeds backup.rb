# Clear existing data
User.destroy_all
Post.destroy_all

# Create a user
user = User.create!(
  email: "quentin.orhant@gmook.com",
  password: "azerty",
  username: "Quentin Orhant"
)

# Create posts
Post.create!([
  {
    title: "Pacte d'impact",
    user_id: user.id,
    unsplash_image_url: "https://images.unsplash.com/photo-1551225183-94acb7d595b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHw5fHx0ZXh0fGVufDB8fHx8MTcyMDYwMTE3OHww&ixlib=rb-4.0.3&q=85&utm_source=utopie2050&utm_medium=referral&utm_campaign=api-credit",
    image_rights: false,
    color: "hsl(204, 100%, 50%)"
  },
  {
    title: "Equilibre instable",
    user_id: user.id,
    unsplash_image_url: "https://images.unsplash.com/photo-1494211903311-37d2d4d8e8c4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHwxfHxpbWFnZXxlbnwwfHx8fDE3MjA2MTY2MzJ8&ixlib=rb-4.0.3&q=85",
    image_rights: false,
    color: "hsl(313, 100%, 50%)"
  },
  {
    title: "Les nomades du futur",
    user_id: user.id,
    unsplash_image_url: "https://images.unsplash.com/photo-1529101091764-c3526daf38fe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHwxfHx0cmF2ZWx8ZW58MHx8fHwxNzIwNjE2NjU0&ixlib=rb-4.0.3&q=85",
    image_rights: false,
    color: "hsl(118, 100%, 50%)"
  }
])
