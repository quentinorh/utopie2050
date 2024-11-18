class AddEventCodeToPosts < ActiveRecord::Migration[7.0]
  def change
    add_column :posts, :event_code, :string
  end
end
