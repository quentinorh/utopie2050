class AddDefaultUsernameToExistingUsers < ActiveRecord::Migration[7.0]
  def up
    User.where(username: nil).find_each do |user|
      user.update(username: "user#{user.id}")
    end
  end

  def down
    # Pas de rollback nécessaire pour cette migration
  end
end
