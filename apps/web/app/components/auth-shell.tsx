import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export const PaginatedList = () => {
  const { data: user, isLoading } = useQuery({
    queryKey: ["users", "list"],
    queryFn: async () : Promise<any[]> => {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/users/1"
      );
      const data : any[] = await response.json();
      return data;
    },
  });

  useEffect(() => {
    if (!isLoading && user) {
      console.log(user);
    }
  }, [user]);

  return <div>
 {
   user?.map(item =>{
    return <div>
    <p>{item.name}</p>
    <p>{item.email}</p>
    <p>{item.phone}</p>
    </div>
   })
 }


  </div>;
};
