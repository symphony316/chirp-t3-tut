import { SignInButton, useUser } from "@clerk/nextjs";
import dayjs from "dayjs";
import { type NextPage } from "next";
import relativeTime from "dayjs/plugin/relativeTime";
import { type RouterOutputs, api } from "~/utils/api";
import Image from "next/image";
import LoadingPage from "~/components/LoadingPage";
import { useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "~/components/LoadingSpinner";
import Link from "next/link";
import { PageLayout } from "~/components/layout";

// why is this being used like this?
dayjs.extend(relativeTime);

const CreatePostWizard = () => {
  const { user } = useUser();
  const [postContent, setPostContent] = useState<string>("");
  const ctx = api.useContext();

  const { mutate, isLoading: isPosting } = api.posts.create.useMutation({
    onSuccess: () => {
      setPostContent("");
      void ctx.posts.getAll.invalidate();
    },
    onError: (error) => {
      const errorMsg = error.data?.zodError?.fieldErrors.content;
      if (errorMsg && errorMsg[0]) {
        toast.error(errorMsg[0]);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("🫠 Failed to post! Please try again later.");
      }
    },
  });

  if (!user || !user.username) return <LoadingPage />;
  return (
    <div className="flex w-full gap-3 ">
      <Image
        src={`${user.profileImageUrl}`}
        alt={`@${user.username}'s profile picture`}
        className="h-14 w-14 rounded-full"
        width={56}
        height={56}
      />
      <input
        type="text"
        placeholder="type some emojis!"
        className="grow bg-transparent outline-none"
        value={postContent}
        onChange={(e) => setPostContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (postContent !== "") {
              mutate({ content: postContent });
            }
          }
        }}
      />
      {postContent !== "" && !isPosting && (
        <button
          className="text-3xl"
          onClick={() => mutate({ content: postContent })}
        >
          📫
        </button>
      )}
      {isPosting && (
        <div className="flex items-center justify-center">
          <LoadingSpinner size={20} />
        </div>
      )}
    </div>
  );
};

type postWithAuthor = RouterOutputs["posts"]["getAll"][number];
const PostView = (props: postWithAuthor) => {
  const { post, author } = props;
  return (
    <div className=" flex gap-3 border-b border-slate-400 p-4" key={post.id}>
      <Link href={`/@${author.username}`}>
        <Image
          src={author.profileImageUrl}
          alt={`@${author.username}'s profile picture`}
          className="h-14 w-14 rounded-full"
          width={56}
          height={56}
        />
      </Link>
      <div className="flex flex-col">
        <div className="gap2 text-slate flex gap-1 ">
          <Link href={`/@${author.username}`}>{`@${author.username}`}</Link>
          <Link href={`/post/${post.id}`}>
            <span className="font-bold">· </span>
            <span className="font-thin">{`${dayjs(
              post.createdAt
            ).fromNow()}`}</span>
          </Link>
        </div>
        <span className="text-2xl">{post.content}</span>
      </div>
    </div>
  );
};

const Feed = () => {
  const { data, isLoading: postLoading } = api.posts.getAll.useQuery();
  if (postLoading) return <LoadingPage />;
  if (!data) return <div>somehting went wrong 😥</div>;
  return (
    <div className="flex flex-col">
      {data?.map((fullPost) => (
        <PostView key={fullPost.post.id} {...fullPost} />
      ))}
    </div>
  );
};

const Home: NextPage = () => {
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  // start fetching ASAP
  api.posts.getAll.useQuery();

  // return empty div if user isn't loaded yet
  if (!userLoaded) return <div />;

  return (
    <PageLayout>
      <div className="flex border-b border-slate-400 p-4">
        {!isSignedIn && (
          <div className="flex justify-center">
            <SignInButton />
          </div>
        )}
        {/* {!!isSignedIn && (
              <div className="flex justify-center">
              <SignOutButton />
              </div>
            )} */}
        {isSignedIn && <CreatePostWizard />}
      </div>
      <Feed />
    </PageLayout>
  );
};

export default Home;
